import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, UserPlus, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { userService } from '@/services/user.service';
import { useAuth } from '@/hooks/useAuth';
import type { CreateUserRequest } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  roleId: z.string().min(1, 'Role is required'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: usersResponse, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list(),
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['roles'],
    queryFn: () => userService.listRoles(),
  });

  const users = usersResponse?.data || [];
  const roles = rolesResponse?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      setShowForm(false);
      setActionError(null);
      setSuccessMessage('User account created successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActionError(null);
      const name = res.data ? `${res.data.firstName} ${res.data.lastName}` : 'account';
      setSuccessMessage(`User ${name} deactivated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to deactivate user.';
      setActionError(msg);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => userService.activate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActionError(null);
      const name = res.data ? `${res.data.firstName} ${res.data.lastName}` : 'account';
      setSuccessMessage(`User ${name} activated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to activate user.';
      setActionError(msg);
    },
  });

  const handleDeactivate = (id: string, name: string) => {
    setSuccessMessage(null);
    setActionError(null);
    if (window.confirm(`Are you sure you want to deactivate user ${name}?`)) {
      deactivateMutation.mutate(id);
    }
  };

  const handleActivate = (id: string, name: string) => {
    setSuccessMessage(null);
    setActionError(null);
    if (window.confirm(`Are you sure you want to activate user ${name}?`)) {
      activateMutation.mutate(id);
    }
  };

  const onSubmit = async (data: CreateUserFormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-bluegray/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy flex items-center gap-2">
              <Users className="h-6 w-6 text-navy" />
              User Access & Roles
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
              Identity Management
            </span>
          </div>
          <p className="text-xs text-navy/60 font-medium mt-0.5">
            Manage system operators, assign permission scopes, and control account lifecycle state.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            createMutation.reset();
          }}
          className="self-start sm:self-auto gap-2 bg-navy text-white hover:bg-navy-dark shadow-sm text-xs font-semibold"
        >
          <UserPlus className="h-4 w-4" />
          {showForm ? 'Cancel Form' : 'New User Account'}
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-medium">
          <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create User Card Form */}
      {showForm && (
        <Card className="border-bluegray/40 shadow-sm bg-white">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-sm font-bold text-navy">Create System User</CardTitle>
            <CardDescription className="text-xs text-navy/60">
              Provision user profile, initial credentials, and authorization role assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {createMutation.isError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-medium">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create user'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-navy uppercase tracking-wider">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="e.g. Jane"
                    className="h-9 text-xs border-bluegray/50 bg-white text-navy focus:border-navy"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-[11px] text-rose-600">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-navy uppercase tracking-wider">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="e.g. Doe"
                    className="h-9 text-xs border-bluegray/50 bg-white text-navy focus:border-navy"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-[11px] text-rose-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold text-navy uppercase tracking-wider">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane.doe@flowfactory.io"
                    className="h-9 text-xs border-bluegray/50 bg-white text-navy focus:border-navy"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-rose-600">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-semibold text-navy uppercase tracking-wider">Initial Password * (min 8 chars)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-9 text-xs border-bluegray/50 bg-white text-navy focus:border-navy"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-[11px] text-rose-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="roleId" className="text-xs font-semibold text-navy uppercase tracking-wider">System Role *</Label>
                <select
                  id="roleId"
                  {...register('roleId')}
                  className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs text-navy font-semibold focus:border-navy focus:outline-none"
                >
                  <option value="">Select a system role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.description ? `— ${role.description}` : ''}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="text-[11px] text-rose-600">{errors.roleId.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending}
                  className="h-9 bg-navy text-white hover:bg-navy-dark shadow-sm text-xs font-semibold"
                >
                  {createMutation.isPending ? 'Provisioning Account...' : 'Save User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="h-9 border-bluegray/40 text-navy hover:bg-cream/40 bg-white text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="border-bluegray/40 shadow-sm bg-white">
        <CardHeader className="border-b border-bluegray/20 pb-3">
          <CardTitle className="text-sm font-bold text-navy uppercase tracking-wider">
            Registered Operators ({users.length})
          </CardTitle>
          <CardDescription className="text-xs text-navy/60">
            Active operator credentials, assigned roles, and access status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/50">
                <TableRow className="border-b border-bluegray/30">
                  <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Operator Name</TableHead>
                  <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Email Address</TableHead>
                  <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Role Scope</TableHead>
                  <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Account State</TableHead>
                  <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Created</TableHead>
                  <TableHead className="text-right text-navy font-bold text-xs uppercase tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs font-semibold text-navy/60">
                      Loading user accounts...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-navy/60">
                      No user accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-b border-bluegray/20 hover:bg-cream/20">
                      <TableCell className="font-semibold text-xs text-navy py-3">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-navy/80 py-3">
                        {user.email}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30 font-mono">
                          <Shield className="h-3 w-3 text-navy/70" />
                          {user.role?.name || 'USER'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-navy/50 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-navy/70 py-3">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        {user.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 hover:text-rose-800 bg-white"
                            disabled={currentUser?.id === user.id || deactivateMutation.isPending}
                            onClick={() => handleDeactivate(user.id, `${user.firstName} ${user.lastName}`)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 bg-white"
                            disabled={activateMutation.isPending}
                            onClick={() => handleActivate(user.id, `${user.firstName} ${user.lastName}`)}
                          >
                            Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
