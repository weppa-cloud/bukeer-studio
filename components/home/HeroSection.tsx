"use client";

import { Search, Calendar, Users, MapPin } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export default function HeroSection() {
  const [searchData, setSearchData] = useState({
    destination: "",
    date: "",
    guests: "2",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search:", searchData);
  };

  return (
    <section className="relative h-[600px] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=2070"
          alt="Colombia landscape"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Descubre la Magia de Colombia
        </h1>
        <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
          Explora destinos increíbles, vive experiencias únicas y crea recuerdos inolvidables
        </p>

        {/* Search Form */}
        <div className="bg-white p-2 rounded-lg shadow-xl max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
            {/* Destination */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <MapPin className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="¿A dónde quieres ir?"
                className="w-full pl-10 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchData.destination}
                onChange={(e) => setSearchData({ ...searchData, destination: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Calendar className="h-5 w-5" />
              </div>
              <input
                type="date"
                placeholder="Fecha"
                className="w-full pl-10 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchData.date}
                onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
              />
            </div>

            {/* Guests */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Users className="h-5 w-5" />
              </div>
              <select
                className="w-full pl-10 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={searchData.guests}
                onChange={(e) => setSearchData({ ...searchData, guests: e.target.value })}
              >
                <option value="1">1 Persona</option>
                <option value="2">2 Personas</option>
                <option value="3">3 Personas</option>
                <option value="4">4 Personas</option>
                <option value="5+">5+ Personas</option>
              </select>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="bg-orange-500 text-white px-8 py-4 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              <span className="font-semibold">Buscar</span>
            </button>
          </form>
        </div>

        {/* Popular Destinations */}
        <div className="mt-8">
          <p className="text-white mb-2">Destinos populares:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Cartagena", "San Andrés", "Medellín", "Bogotá", "Santa Marta", "Eje Cafetero"].map((dest) => (
              <button
                key={dest}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full hover:bg-opacity-30 transition backdrop-blur-sm"
                onClick={() => setSearchData({ ...searchData, destination: dest })}
              >
                {dest}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}