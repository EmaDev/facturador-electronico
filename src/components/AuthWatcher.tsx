"use client"
import { useEffect } from "react";
import { useAccountStore } from "@/store/account";
import { useRouter } from "next/navigation";

function AuthWatcher() {
  const auth = useAccountStore((s) => s.auth);
  const clear = useAccountStore((s) => s.clear);
  const router = useRouter();

  useEffect(() => {
    if (!auth?.wsaa_expires) return;

    const expDate = new Date(auth.wsaa_expires).getTime();
    const now = Date.now();
    const msUntilExp = expDate - now;

    if (msUntilExp <= 0) {
      clear();
      router.push("/login"); 
      return;
    }

    const timer = setTimeout(() => {
      clear();
      router.push("/login");
    }, msUntilExp);

    return () => clearTimeout(timer);
  }, [auth?.wsaa_expires, clear]);

  return null;
}

export default AuthWatcher;