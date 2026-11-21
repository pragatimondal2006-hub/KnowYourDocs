import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import clsx from "clsx";

export default function UploadZone({
  onFilesSelected,
  isUploading,
}: {
  onFilesSelected: (files: FileList) => void;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) onFilesSelected(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-200",
        isDragging ? "border-caramel bg-oat/50" : "border-border bg-ivory hover:border-caramel/60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-oat text-espresso">
        <UploadCloud size={20} />
      </div>
      <p className="text-sm font-medium text-coffee">
        {isUploading ? "Uploading and processing…" : "Drop PDF files here, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-grey">PDF only · up to 25MB per file</p>
    </div>
  );
}
