import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/test/api";

/** The signed-in user plus the account details the shell shows. */
export type Account = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
};

const AccountContext = createContext<Account | null>(null);

export function accountFromSession(user: SessionUser): Account {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function AccountProvider({ value, children }: { value: Account; children: ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  const value = useContext(AccountContext);
  if (!value) throw new Error("Account state is only available inside the signed-in app.");
  return value;
}

export function useOptionalAccount() {
  return useContext(AccountContext);
}
