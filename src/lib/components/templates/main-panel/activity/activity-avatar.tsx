import { cn } from "@/lib/utils/cn";

type ActivityAvatarProps = {
    className?: string;
    imageUrl?: string;
    name: string;
};

export function ActivityAvatar({
    className,
    imageUrl,
    name,
}: ActivityAvatarProps) {
    if (imageUrl) {
        return (
            <img
                alt={`${name}'s avatar`}
                className={cn(
                    "border-border size-8 rounded-lg border object-cover",
                    className,
                )}
                src={imageUrl}
            />
        );
    }

    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

    return (
        <span
            aria-hidden="true"
            className={cn(
                `bg-muted text-muted-foreground grid size-8 place-items-center
                rounded-lg text-[10px] font-semibold`,
                className,
            )}
        >
            {initials || "?"}
        </span>
    );
}
