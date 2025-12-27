// مكون Skeleton Loading موحد - Design System
export default function Skeleton({
  variant = "text", // text | circular | rectangular | rounded
  width,
  height,
  className = "",
  count = 1,
  animation = "pulse", // pulse | wave | none
  ...props
}) {
  const baseClass = "skeleton";
  const variantClass = `skeleton--${variant}`;
  const animationClass = animation !== "pulse" ? `skeleton--${animation}` : "";
  const classes = [baseClass, variantClass, animationClass, className]
    .filter(Boolean)
    .join(" ");

  const style = {
    width: width || (variant === "circular" ? "40px" : "100%"),
    height: height || (variant === "circular" ? "40px" : variant === "text" ? "1em" : "200px"),
    borderRadius: variant === "circular" ? "50%" : variant === "rounded" ? "var(--radius-md)" : "0",
    ...props.style
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={classes}
            style={style}
            {...props}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className={classes}
      style={style}
      {...props}
    />
  );
}

