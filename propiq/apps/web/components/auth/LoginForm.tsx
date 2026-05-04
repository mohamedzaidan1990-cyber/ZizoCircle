"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginAction } from "@/lib/auth-actions";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const result = await loginAction(values);
    if (!result.ok) {
      setError(result.error || t("auth.errorGeneric"));
      return;
    }
    router.push(`/${result.locale ?? locale}/dashboard`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="email">
          {t("common.email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="input"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="password">
          {t("common.password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? t("common.loading") : t("auth.loginCta")}
      </button>
    </form>
  );
}
