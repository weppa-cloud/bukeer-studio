'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface ActivitiesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function ActivitiesSection({ section }: ActivitiesSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    activities?: Array<{
      id: string;
      name: string;
      image: string;
      duration?: string;
      price?: string;
    }>;
  };

  const title = sectionContent.title || 'Experiencias Únicas';
  const activities = sectionContent.activities || [];

  return (
    <div className="section-padding">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden">
                {activity.image ? (
                  <Image
                    src={activity.image}
                    alt={activity.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold text-white">{activity.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-sm text-white/80">
                    {activity.duration && <span>{activity.duration}</span>}
                    {activity.price && <span className="font-semibold">{activity.price}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
