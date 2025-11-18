import fs from "fs";
import path from "path";
import Image from "next/image";

type GalleryImage = {
  filename: string;
  alt: string;
};

const configuredImages: GalleryImage[] = [
  {
    filename: "0325-TablesL.jpeg",
    alt: "Full hall with banquet seating and polished floors",
  },
  {
    filename: "0325-TablesR.jpeg",
    alt: "Hall view from the opposite side with warm lighting",
  },
  {
    filename: "0325-TablesClose.jpeg",
    alt: "Close view of table settings and wood floors",
  },
  {
    filename: "0325-Arch.jpeg",
    alt: "Balloon arch and marquee number for a first birthday",
  },
  {
    filename: "Decorations.jpg",
    alt: "Decor tables with greenery backdrop",
  },
  {
    filename: "Guest Area.png",
    alt: "Guest seating area with elegant place settings",
  },
  {
    filename: "Tables 1.png",
    alt: "Reception-style layout with round and rectangular tables",
  },
  {
    filename: "Tables 2.png",
    alt: "Event layout with floor-to-ceiling drape accents",
  },
  {
    filename: "Tables 3.jpg",
    alt: "Reception-ready tables with greenery accents",
  },
  {
    filename: "Bar Area.png",
    alt: "Bar area and back counter for service setup",
  },
  {
    filename: "Entrance.png",
    alt: "Accessible entrance ramp to Greenwood Hall",
  },
  {
    filename: "0325-Sign.jpeg",
    alt: "Exterior Greenwood Hall signage",
  },
];

function getExistingImages() {
  const basePath = path.join(process.cwd(), "public", "images");

  return configuredImages
    .filter(({ filename }) => fs.existsSync(path.join(basePath, filename)))
    .map((image) => ({
      ...image,
      src: `/images/${encodeURI(image.filename)}`,
    }));
}

export default function Gallery() {
  const images = getExistingImages();

  if (images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, 3);
  const [leadImage, ...rest] = displayImages;

  return (
    <section id="gallery" className="py-12 lg:py-16">
      <div className="rounded-3xl bg-white/80 p-8 shadow-card ring-1 ring-primary/5 sm:p-10">
        <div className="space-y-2">
          <h2>See the Space</h2>
          <p className="text-lg text-slate-700">
            Real photos of Greenwood Hall so you can picture your celebration in
            the space.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-primary/10 bg-white/70 shadow-sm">
            <div className="relative aspect-[16/9]">
              <Image
                src={leadImage.src}
                alt={leadImage.alt}
                fill
                priority
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="px-4 py-3 text-sm font-medium text-slate-700">
              {leadImage.alt}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 2).map((image) => (
              <div
                key={image.src}
                className="overflow-hidden rounded-2xl border border-primary/10 bg-white/70 shadow-sm"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3 text-sm font-medium text-slate-700">
                  {image.alt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
