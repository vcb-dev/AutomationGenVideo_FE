import { UserRole } from "@/types/auth";
import { useLang } from "@/contexts/SocialLanguageContext";

export function useRoleLabels(): Record<UserRole, string> {
    const { t } = useLang();
    return {
        [UserRole.ADMIN]: t.nav.roleAdmin,
        [UserRole.MANAGER]: t.nav.roleManager,
        [UserRole.LEADER]: t.nav.roleLeader,
        [UserRole.MEMBER]: t.nav.roleMember,
        [UserRole.EDITOR]: t.nav.roleEditor,
        [UserRole.CONTENT]: t.nav.roleContent,
    };
}
