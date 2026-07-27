"use client";

import { useState } from "react";
import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

/**
 * Photos are optional. Until real files exist in /public/gallery, each tile
 * falls back to a tinted card showing the caption, so the section looks
 * deliberate rather than broken.
 */
function Photo({ src, alt, index }: { src: string; alt: string; index: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <Reveal delay={index * 60} className="group relative aspect-4/5 overflow-hidden bg-paper-sunk">
      {failed ? (
        <div className="flex h-full items-end bg-linear-to-br from-blush/40 to-paper-sunk p-4">
          <p className="text-xs text-ink-faint">{alt}</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
    </Reveal>
  );
}

export default function Gallery() {
  if (wedding.gallery.photos.length === 0) return null;

  return (
    <Section id="photos" eyebrow="Evidence" heading={wedding.gallery.heading}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {wedding.gallery.photos.map((photo, i) => (
          <Photo key={photo.src} src={photo.src} alt={photo.alt} index={i} />
        ))}
      </div>
    </Section>
  );
}
