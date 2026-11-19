import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  fallback: ReactNode;
};

/** Keeps the current bitmap visible until a newly selected variation has decoded. */
export function StableCatalogImage({ src, fallback, onError, ...props }: Props) {
  const [displayed, setDisplayed] = useState(src);
  const request = useRef(0);
  useEffect(() => {
    const current = ++request.current;
    if (!src) {
      setDisplayed("");
      return;
    }
    if (src === displayed) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (request.current === current) setDisplayed(src);
    };
    image.onerror = () => {
      if (request.current === current) setDisplayed("");
    };
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [displayed, src]);
  if (!displayed) return fallback;
  return (
    <img
      {...props}
      src={displayed}
      data-requested-src={src || undefined}
      onError={(event) => {
        if (displayed === src) setDisplayed("");
        onError?.(event);
      }}
    />
  );
}
