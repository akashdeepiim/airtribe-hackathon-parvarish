import { z } from 'zod';
export const roles = ['owner', 'co_parent', 'family_contributor', 'family_viewer'] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  co_parent: 'Co-parent',
  family_contributor: 'Contributor',
  family_viewer: 'Viewer',
};
export const capabilities = [
  'profile.read',
  'profile.edit',
  'memories.read',
  'memories.add',
  'memories.edit_own',
  'memories.edit_all',
  'memories.delete_own',
  'memories.delete_all',
  'milestones.read',
  'milestones.write',
  'activities.read',
  'activities.feedback',
  'family.read',
  'family.manage',
  'health.read',
  'health.write',
  'audit.read',
] as const;
export type Capability = (typeof capabilities)[number];
export const permissionLabels: Record<Capability, string> = {
  'profile.read': 'View child profile',
  'profile.edit': 'Edit child profile',
  'memories.read': 'View memories',
  'memories.add': 'Add memories',
  'memories.edit_own': 'Edit their own memories',
  'memories.edit_all': 'Edit all memories',
  'memories.delete_own': 'Delete their own memories',
  'memories.delete_all': 'Delete all memories',
  'milestones.read': 'View milestones',
  'milestones.write': 'Record milestones',
  'activities.read': 'View activities',
  'activities.feedback': 'Respond to activities',
  'family.read': 'View family members',
  'family.manage': 'Invite and remove family',
  'health.read': 'View health records',
  'health.write': 'Edit health records',
  'audit.read': 'View access history',
};
export const parentOnly = new Set<Capability>([
  'family.manage',
  'health.write',
  'memories.delete_all',
]);
export function defaultPermissions(role: Role): Record<Capability, boolean> {
  const defaults: readonly Capability[] =
    role === 'family_viewer'
      ? ['profile.read', 'memories.read', 'family.read']
      : role === 'family_contributor'
        ? [
            'profile.read',
            'memories.read',
            'family.read',
            'memories.add',
            'memories.edit_own',
            'memories.delete_own',
          ]
        : capabilities;
  return Object.fromEntries(capabilities.map((c) => [c, defaults.includes(c)])) as Record<
    Capability,
    boolean
  >;
}
export const accessSchema = z.object({
  role: z.enum(roles),
  capabilities: z.record(z.enum(capabilities), z.boolean()),
  purposes: z.object({
    memories: z.boolean(),
    milestones: z.boolean(),
    health: z.boolean(),
    personalisation: z.boolean(),
    notifications: z.boolean(),
  }),
});
export type Access = z.infer<typeof accessSchema>;
