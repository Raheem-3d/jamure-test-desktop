import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "emoji-picker-react";
import { Message } from "./message-list";

type ReactionPickerProps = {
  message: Message;
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onReact: (emoji: string) => void;
};

export const ReactionPicker = ({
  message,
  isOpen,
  anchorRef,
  onClose,
  onReact,
}: ReactionPickerProps) => {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position calculation — layout safe
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const pickerWidth = 350;
    const pickerHeight = 350;
    const padding = 8;

    let top = rect.bottom + padding;
    let left = rect.right - pickerWidth;

    // Vertical overflow
    if (top + pickerHeight > window.innerHeight) {
      top = rect.top - pickerHeight - padding;
    }

    // Horizontal overflow
    if (left < padding) left = padding;
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding;
    }

    setPos({ top, left });
  }, [isOpen, anchorRef]);

  // Click outside — NO timers, NO race conditions
  useLayoutEffect(() => {
    if (!isOpen) return;

    const handler = (e: MouseEvent) => {
      if (!pickerRef.current) return;

      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !pos) return null;

  return createPortal(
    <div
      ref={pickerRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 350,
        zIndex: 10000,
      }}
    >
      {/* <div className="rounded-xl border bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
        <EmojiPicker
          height={350}
          width={350}
          previewConfig={{ showPreview: false }}
          lazyLoadEmojis
          onEmojiClick={(emojiData) => {
            onReact(emojiData.emoji);
            onClose();
          }}
        />
      </div> */}

      <div className="rounded-xl border bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            React
          </span>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close emoji picker"
          >
            ✕
          </button>
        </div>

        {/* Emoji Picker */}
        <EmojiPicker
          height={300}
          width={350}
          previewConfig={{ showPreview: false }}
          lazyLoadEmojis
          onEmojiClick={(emojiData) => {
            onReact(emojiData.emoji);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
};
