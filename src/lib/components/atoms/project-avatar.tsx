import { cn } from "@/lib/utils/cn";

type ProjectAvatarProps = {
    className?: string;
    src: string;
};

export function ProjectAvatar({ className, src }: ProjectAvatarProps) {
    return (
        <img
            alt=""
            aria-hidden="true"
            className={cn("block [border-radius:99999999px]", className)}
            src={src}
        />
    );
}
