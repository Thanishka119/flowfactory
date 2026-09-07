import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const idParamSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  supplierId: z.string().optional(),
  purchaseId: z.string().optional(),
});

export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, status, supplierId, purchaseId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(purchaseId && { purchaseId }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { originalFilename: { contains: search, mode: 'insensitive' } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          purchase: {
            select: {
              id: true,
              purchaseNumber: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchase: {
          select: {
            id: true,
            purchaseNumber: true,
            totalAmount: true,
            status: true,
          },
        },
        items: {
          include: {
            matchedItem: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

const createInvoiceSchema = z.object({
  originalFilename: z.string().min(1, 'Original filename is required'),
  fileUrl: z.string().optional().nullable(),
  fileSize: z.coerce.number().default(0),
  mimeType: z.string().default('application/pdf'),
  supplierId: z.string().uuid().optional().nullable(),
  purchaseId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable(),
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  items: z
    .array(
      z.object({
        extractedDescription: z.string().min(1, 'Description is required'),
        extractedSku: z.string().optional().nullable(),
        quantity: z.coerce.number().positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
        totalPrice: z.coerce.number().min(0).optional(),
        matchedItemId: z.string().uuid().optional().nullable(),
      })
    )
    .optional(),
});

export const createInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createInvoiceSchema.parse(req.body);

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        return next(new AppError('Referenced supplier not found', 404));
      }
    }

    if (data.purchaseId) {
      const purchase = await prisma.purchase.findUnique({ where: { id: data.purchaseId } });
      if (!purchase) {
        return next(new AppError('Referenced purchase order not found', 404));
      }
      if (data.supplierId && purchase.supplierId !== data.supplierId) {
        return next(new AppError('Purchase order does not belong to the selected supplier', 400));
      }
    }

    const storageKey = `invoices/${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const hasItems = data.items && data.items.length > 0;
    const initialStatus = hasItems ? InvoiceStatus.EXTRACTED : InvoiceStatus.UPLOADED;

    const invoiceItemsData = data.items?.map((item) => ({
      extractedDescription: item.extractedDescription,
      extractedSku: item.extractedSku || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice !== undefined ? item.totalPrice : item.quantity * item.unitPrice,
      matchedItemId: item.matchedItemId || null,
      matchConfidence: item.matchedItemId ? 1.0 : null,
      matchReason: item.matchedItemId ? 'Manual line item selection' : null,
      isUserVerified: false,
    }));

    const invoice = await prisma.invoice.create({
      data: {
        originalFilename: data.originalFilename,
        storageKey,
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        status: initialStatus,
        supplierId: data.supplierId || null,
        purchaseId: data.purchaseId || null,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        totalAmount: data.totalAmount !== undefined && data.totalAmount !== null ? data.totalAmount : null,
        uploadedById: req.user?.userId || null,
        ...(invoiceItemsData && {
          items: {
            create: invoiceItemsData,
          },
        }),
      },
      include: {
        supplier: true,
        purchase: true,
        items: {
          include: {
            matchedItem: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

const verifyInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  purchaseId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable(),
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        extractedDescription: z.string().optional(),
        extractedSku: z.string().optional().nullable(),
        quantity: z.coerce.number().positive().optional(),
        unitPrice: z.coerce.number().min(0).optional(),
        totalPrice: z.coerce.number().min(0).optional(),
        matchedItemId: z.string().uuid().optional().nullable(),
        isUserVerified: z.boolean().default(true),
      })
    )
    .optional(),
});

export const verifyInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = verifyInvoiceSchema.parse(req.body);

    if (!req.user?.userId) {
      return next(new AppError('Authentication required', 401));
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingInvoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Only allow transition to VERIFIED from sensible pre-verification states
    if (
      existingInvoice.status !== InvoiceStatus.UPLOADED &&
      existingInvoice.status !== InvoiceStatus.PROCESSING &&
      existingInvoice.status !== InvoiceStatus.EXTRACTED
    ) {
      return next(new AppError(`Cannot verify invoice with status ${existingInvoice.status}`, 400));
    }

    // Validate supplierId if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        return next(new AppError('Referenced supplier not found', 404));
      }
    }

    // Validate purchaseId if provided
    if (data.purchaseId) {
      const purchase = await prisma.purchase.findUnique({ where: { id: data.purchaseId } });
      if (!purchase) {
        return next(new AppError('Referenced purchase order not found', 404));
      }
      // If both supplier and purchase are specified, ensure they match
      const targetSupplierId = data.supplierId || existingInvoice.supplierId;
      if (targetSupplierId && purchase.supplierId !== targetSupplierId) {
        return next(new AppError('Purchase order does not belong to the selected supplier', 400));
      }
    }

    // Validate that all items are verified and matched
    // Map incoming item updates by id for verification check
    const incomingItemsMap = new Map(data.items?.map((item) => [item.id, item]) ?? []);

    for (const item of existingInvoice.items) {
      const updateData = incomingItemsMap.get(item.id);
      const isVerified = updateData?.isUserVerified ?? item.isUserVerified;
      const matchedItemId = updateData?.matchedItemId !== undefined ? updateData.matchedItemId : item.matchedItemId;

      if (!isVerified) {
        return next(
          new AppError(
            `All invoice line items must be verified before the invoice can be marked as VERIFIED (item "${item.extractedDescription}" is unverified)`,
            400,
          ),
        );
      }

      if (!matchedItemId) {
        return next(
          new AppError(
            `All invoice line items must be matched to an inventory item before verification (item "${item.extractedDescription}" has no matched item)`,
            400,
          ),
        );
      }
    }

    const verified = await prisma.$transaction(async (tx) => {
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.id) {
            await tx.invoiceItem.update({
              where: { id: item.id },
              data: {
                ...(item.matchedItemId !== undefined && { matchedItemId: item.matchedItemId }),
                ...(item.quantity !== undefined && { quantity: item.quantity }),
                ...(item.unitPrice !== undefined && { unitPrice: item.unitPrice }),
                ...(item.totalPrice !== undefined && { totalPrice: item.totalPrice }),
                isUserVerified: item.isUserVerified,
              },
            });
          }
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.VERIFIED,
          verifiedById: req.user!.userId,
          ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
          ...(data.purchaseId !== undefined && { purchaseId: data.purchaseId }),
          ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber || null }),
          ...(data.invoiceDate !== undefined && { invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null }),
          ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
        },
        include: {
          supplier: true,
          purchase: true,
          items: {
            include: {
              matchedItem: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      data: verified,
      message: 'Invoice verified successfully',
    });
  } catch (error) {
    next(error);
  }
};
