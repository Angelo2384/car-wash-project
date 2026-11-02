import { useState } from "react";
import { User } from "lucide-react";

type UserAvatarProps = {
  photoURL?: string | null;
  /** Tailwind size + shape classes, e.g. "w-8 h-8 rounded-full" */
  className?: string;
  /** Tailwind size classes for the default person icon */
  iconClassName?: string;
};

/** The user's photo, or the default person icon when they have none (or it fails to load). */
export default function UserAvatar({
  photoURL,
  className = "w-8 h-8 rounded-full",
  iconClassName = "w-[18px] h-[18px]",
}: UserAvatarProps) {
  const [failedURL, setFailedURL] = useState<string | null>(null);

  if (photoURL && photoURL !== failedURL) {
    return (
      <img
        src={photoURL}
        alt=""
        onError={() => setFailedURL(photoURL)}
        className={`${className} object-cover shrink-0 bg-[#1F1F1F]`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 flex items-center justify-center bg-[#2C2C2C] text-[#A1A1AA] border border-[#3A3A3A]`}
    >
      <User className={iconClassName} />
    </span>
  );
}
