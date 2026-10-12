// Tenant-isolated reseller hierarchy with cycle prevention and bounded depth.

export type ResellerNode = { id: string; parentId: string | null };

export function findPathToRoot(node: ResellerNode, byId: Map<string, ResellerNode>): string[] {
  const path: string[] = [];
  let current: ResellerNode | undefined = node;
  const seen = new Set<string>();
  while (current && current.parentId) {
    if (seen.has(current.id)) throw new Error('reseller hierarchy cycle detected');
    seen.add(current.id);
    path.push(current.parentId);
    current = byId.get(current.parentId);
  }
  return path;
}

export function wouldCreateCycle(node: ResellerNode, newParentId: string | null, byId: Map<string, ResellerNode>): boolean {
  if (!newParentId) return false;
  if (newParentId === node.id) return true;
  // Walk up from newParent; if we reach node.id, cycle.
  const seen = new Set<string>([node.id]);
  let current = byId.get(newParentId);
  while (current) {
    if (seen.has(current.id)) return true;
    seen.add(current.id);
    if (!current.parentId) break;
    current = byId.get(current.parentId);
  }
  return false;
}

export function depth(node: ResellerNode, byId: Map<string, ResellerNode>): number {
  let d = 0;
  let current: ResellerNode | undefined = node;
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) throw new Error('reseller hierarchy cycle detected');
    seen.add(current.id);
    d += 1;
    current = byId.get(current.parentId);
  }
  return d;
}

export function assertWithinDepth(node: ResellerNode, maxDepth: number, byId: Map<string, ResellerNode>): void {
  if (depth(node, byId) > maxDepth) throw new Error(`reseller hierarchy exceeds maximum depth of ${maxDepth}`);
}

// Reseller API scopes are a strict subset; tenant authorization is checked independently.
export const resellerScopes = ['orders:read', 'orders:write', 'products:read'] as const;
export function assertResellerScope(requested: string[]): void {
  for (const scope of requested) if (!(resellerScopes as readonly string[]).includes(scope)) throw new Error(`reseller scope not permitted: ${scope}`);
}