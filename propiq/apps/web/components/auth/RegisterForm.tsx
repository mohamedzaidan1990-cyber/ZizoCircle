"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { registerAction } from "@/lib/auth-actions";

const schema = z.object({
  agencyName: z.string().min(2).max(100),
  agencyNameAr: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : undefined)),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Use a-z, 0-9, underscore only"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const result = await registerAction(values);
    if (!result.ok) {
      setError(result.error || t("auth.errorGeneric"));
      return;
    }
    router.push(`/${result.locale ?? locale}/dashboard`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="firstName">
            {t("common.firstName")}
          </label>
          <input id="firstName" className="input" {...register("firstName")} />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            {t("common.lastName")}
          </label>
          <input id="lastName" className="input" {...register("lastName")} />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="agencyName">
          {t("auth.agencyName")}
        </label>
        <input id="agencyName" className="input" {...register("agencyName")} />
        {errors.agencyName && (
          <p className="mt-1 text-xs text-red-600">{errors.agencyName.message}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="agencyNameAr">
          {t("auth.agencyNameAr")}
        </label>
        <input
          id="agencyNameAr"
          className="input"
          dir="rtl"
          {...register("agencyNameAr")}
        />
      </div>

      <div>
        <label className="label" htmlFor="slug">
          {t("auth.slug")}
        </label>
        <input id="slug" className="input" placeholder="my_agency" {...register("slug")} />
        <p className="mt-1 text-xs text-slate-500">{t("auth.slugHint")}</p>
        {errors.slug && (
          <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
        )}
      </div>

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
          autoComplete="new-password"
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
        {isSubmitting ? t("common.loading") : t("auth.registerCta")}
      </button>
    </form>
  );
}
