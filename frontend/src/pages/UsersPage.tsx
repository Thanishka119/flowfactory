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
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            User Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage system users, credentials, and role-based access control.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            createMutation.reset();
          }}
          className="self-start sm:self-auto gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 p-3 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-md">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create User Card Form */}
      {showForm && (
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Create New User</CardTitle>
            <CardDescription>
              Assign user details and their system role. Account will be immediately active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {createMutation.isError && (
                <div className="p-3 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-md">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create user'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="e.g. Jane" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="e.g. Doe" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="jane.doe@example.com" {...register('email')} />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password * (min 8 chars)</Label>
                  <Input id="password" type="password" placeholder="--------" {...register('password')} />
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roleId">Role *</Label>
                <select
                  id="roleId"
                  {...register('roleId')}
                  className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-white"
                >
                  <option value="">Select a system role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.description ? `- ${role.description}` : ''}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="text-xs text-red-500">{errors.roleId.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Save User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Registered Users</CardTitle>
          <CardDescription>
            Active user accounts and assigned authorization levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-sm text-neutral-500">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-sm text-neutral-500">
                      No user accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-sm text-neutral-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 font-mono text-xs">
                          <Shield className="h-3 w-3" />
                          {user.role?.name || 'USER'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-500 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/50"
                            disabled={currentUser?.id === user.id || deactivateMutation.isPending}
                            onClick={() => handleDeactivate(user.id, `${user.firstName} ${user.lastName}`)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/50 dark:hover:bg-emerald-950/50"
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
