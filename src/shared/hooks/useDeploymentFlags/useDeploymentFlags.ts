import { platformConfig } from '@/core/config/env.ts';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import {
  type DeploymentFlags,
  type DeploymentMode,
  mergeDeploymentFlags,
  resolveDeploymentMode,
} from '@/shared/tenancy/deployment-mode.ts';

/**
 * Effective deployment flags — me/context when loaded, else the derived store.
 */
export function useDeploymentFlags(): DeploymentFlags {
  const storeFlags = useOrganizationStore((s) => s.deploymentFlags);
  const { data: ctx } = useMeContext();
  return mergeDeploymentFlags(
    ctx?.deploymentFlags ?? storeFlags,
    platformConfig.deploymentOverrides,
  );
}

export function useDeploymentMode(): DeploymentMode {
  return resolveDeploymentMode(useDeploymentFlags());
}
