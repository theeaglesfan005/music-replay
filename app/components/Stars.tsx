import { Star, StarHalf } from "lucide-react";

interface StarsProps {
  count: number;
  size?: number;
}

export default function Stars({ count, size = 14 }: StarsProps) {
  const fullStars = Math.floor(count);
  const hasHalfStar = count % 1 >= 0.5;
  
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= fullStars) {
          return (
            <Star
              key={i}
              size={size}
              style={{ color: "#FF0436" }}
              fill="currentColor"
            />
          );
        } else if (i === fullStars + 1 && hasHalfStar) {
          return (
            <StarHalf
              key={i}
              size={size}
              style={{ color: "#FF0436" }}
              fill="currentColor"
            />
          );
        } else {
          return (
            <Star
              key={i}
              size={size}
              className="text-white/10"
              fill="none"
            />
          );
        }
      })}
    </span>
  );
}
