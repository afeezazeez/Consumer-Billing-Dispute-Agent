import { useEffect, useRef } from "react";

export function ComposerAttachmentThumbnail({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(file);
    image.src = url;
    return () => {
      image.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return <picture><img ref={imageRef} alt="" /></picture>;
}
