'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef, MouseEvent } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface DestinationsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface Destination {
  id: string;
  name: string;
  image: string;
  description?: string;
  price?: string;
}

// Tilt Card Component with 3D effect
function TiltCard({ destination }: { destination: Destination }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className="relative aspect-[4/5] rounded-xl cursor-pointer"
    >
      <div
        style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}
        className="absolute inset-2 rounded-xl overflow-hidden shadow-xl"
      >
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div
          style={{ transform: "translateZ(50px)" }}
          className="absolute bottom-0 left-0 right-0 p-6"
        >
          <h3 className="text-xl font-bold text-white drop-shadow-lg">{destination.name}</h3>
          {destination.description && (
            <p className="mt-2 text-white/90 text-sm line-clamp-2 drop-shadow">
              {destination.description}
            </p>
          )}
          {destination.price && (
            <p className="mt-3 text-white font-semibold drop-shadow">
              Desde <span className="text-lg">{destination.price}</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function DestinationsSection({ section }: DestinationsSectionProps) {
  const variant = section.variant || 'grid';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    destinations?: Destination[];
  };

  const title = sectionContent.title || 'Destinos Destacados';
  const subtitle = sectionContent.subtitle || 'Descubre los lugares más increíbles';
  const destinations = sectionContent.destinations || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="section-padding">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          {subtitle && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Grid variant */}
        {variant === 'grid' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {destinations.map((destination) => (
              <motion.div
                key={destination.id}
                variants={itemVariants}
                className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer"
              >
                {destination.image ? (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white">{destination.name}</h3>
                  {destination.description && (
                    <p className="mt-2 text-white/80 text-sm line-clamp-2">
                      {destination.description}
                    </p>
                  )}
                  {destination.price && (
                    <p className="mt-3 text-white font-semibold">
                      Desde <span className="text-lg">{destination.price}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Bento variant */}
        {variant === 'bento' && destinations.length >= 5 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]"
          >
            {destinations.slice(0, 5).map((destination, index) => (
              <motion.div
                key={destination.id}
                variants={itemVariants}
                className={`group relative rounded-xl overflow-hidden cursor-pointer ${
                  index === 0 ? 'col-span-2 row-span-2' : ''
                }`}
              >
                {destination.image ? (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className={`font-bold text-white ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                    {destination.name}
                  </h3>
                  {destination.price && index === 0 && (
                    <p className="mt-2 text-white/90">Desde {destination.price}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Carousel variant */}
        {variant === 'carousel' && (
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {destinations.map((destination) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex-none w-72 md:w-80 snap-center"
              >
                <div className="group relative aspect-[3/4] rounded-xl overflow-hidden">
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-lg font-bold text-white">{destination.name}</h3>
                    {destination.price && (
                      <p className="mt-1 text-white/80">Desde {destination.price}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tilt variant - 3D effect on hover */}
        {variant === 'tilt' && (
          <div
            style={{ perspective: "1500px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {destinations.map((destination, index) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <TiltCard destination={destination} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {destinations.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No hay destinos configurados</p>
          </div>
        )}
      </div>
    </div>
  );
}
