/**
 * Branded types — prevent accidental ID swaps at the type level.
 *
 * Usage:
 *   const userId: UserId = UserId('abc-123');
 *   const tenantId: TenantId = TenantId('tenant-456');
 *   // Error: Type 'UserId' is not assignable to type 'TenantId'
 *   const wrongTenant: TenantId = userId;
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type OrgId = Brand<string, 'OrgId'>;

/** Create a branded UserId from a validated string */
export const UserId = (id: string) => id as UserId;

/** Create a branded TenantId from a validated string */
export const TenantId = (id: string) => id as TenantId;

/** Create a branded OrgId from a validated string */
export const OrgId = (id: string) => id as OrgId;
