"use client";

import Link from "next/link";
import {
  IconPencil,
  IconStar,
  IconTrash,
} from "@/components/establishments/EstablishmentLibraryIcons";

export interface LibraryItemRowProps {
  name: string;
  meta?: string;
  editHref: string;
  isFavorite: boolean;
  selected?: boolean;
  showSelect?: boolean;
  onSelect?: (checked: boolean) => void;
  onToggleFavorite: () => void;
  onRequestDelete: () => void;
}

export function LibraryItemRow({
  name,
  meta,
  editHref,
  isFavorite,
  selected = false,
  showSelect = false,
  onSelect,
  onToggleFavorite,
  onRequestDelete,
}: LibraryItemRowProps) {
  return (
    <li className={`est-row${selected ? " is-selected" : ""}`}>
      {showSelect ? (
        <label className="est-row-check" aria-label={`Select ${name}`}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
          />
        </label>
      ) : null}

      <button
        type="button"
        className={`est-row-action est-row-action--star${isFavorite ? " is-active" : ""}`}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <IconStar filled={isFavorite} />
      </button>

      <Link href={editHref} className="est-row-body">
        <p className="est-row-name">{name}</p>
        {meta ? <p className="est-row-meta">{meta}</p> : null}
      </Link>

      <div className="est-row-actions">
        <Link
          href={editHref}
          className="est-row-action est-row-action--edit"
          aria-label={`Edit ${name}`}
        >
          <IconPencil />
        </Link>
        <button
          type="button"
          className="est-row-action est-row-action--delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestDelete();
          }}
          aria-label={`Delete ${name}`}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  );
}
