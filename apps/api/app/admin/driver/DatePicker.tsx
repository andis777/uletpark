"use client";
import { useRouter } from "next/navigation";

export function DatePicker({ initial }: { initial: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={initial}
      onChange={(e) => router.push(`/admin/driver?date=${e.target.value}`)}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        fontSize: 14,
      }}
    />
  );
}
