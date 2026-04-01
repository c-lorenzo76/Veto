import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "@/SocketContext";
import { Layout } from "./Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Phone, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

function MapController({ selectedPlaceId, places }) {
    const map = useMap();
    useEffect(() => {
        if (selectedPlaceId) {
            const place = places.find(p => p.place_id === selectedPlaceId);
            if (place?.geometry?.location) {
                map.flyTo([place.geometry.location.lat, place.geometry.location.lng], 15, { duration: 0.8 });
            }
        } else if (places.length > 0 && places[0].geometry?.location) {
            map.flyTo([places[0].geometry.location.lat, places[0].geometry.location.lng], 12, { duration: 0.8 });
        }
    }, [selectedPlaceId]);
    return null;
}


export const Results = () => {
    const { socket } = useSocket();
    const { code } = useParams();

    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const [placeDetailsMap, setPlaceDetailsMap] = useState({});
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const loadingDetailRef = useRef(null);

    const youAreHereIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>
            <span style="font-size:10px;font-weight:700;color:#ef4444;white-space:nowrap;margin-top:3px;text-shadow:0 1px 2px white">You are here</span>
        </div>`,
        iconSize: [80, 36],
        iconAnchor: [40, 8],
    });

    if (!socket) {
        console.error('Socket is not initialized..');
        return;
    }

    useEffect(() => {
        socket.on('getPlaces', ({ places, coords }) => {
            setPlaces(places);
            setLoading(false);
            if (coords) {
                const [lat, lng] = coords.split(',').map(Number);
                setUserLocation([lat, lng]);
            }
            if (places.length > 0) {
                const first = places[0];
                setSelectedPlaceId(first.place_id);
                loadingDetailRef.current = first.place_id;
                setLoadingDetailId(first.place_id);
                socket.emit('getPlaceDetails', { placeId: first.place_id });
            }
        });

        socket.on('placeDetails', (details) => {
            const id = loadingDetailRef.current;
            if (id) {
                setPlaceDetailsMap(prev => ({ ...prev, [id]: details }));
                setLoadingDetailId(null);
                loadingDetailRef.current = null;
            }
        });
    }, [code, socket]);

    const handleSelectPlace = (place) => {
        if (selectedPlaceId === place.place_id) {
            setSelectedPlaceId(null);
            return;
        }
        setSelectedPlaceId(place.place_id);
        if (!placeDetailsMap[place.place_id]) {
            loadingDetailRef.current = place.place_id;
            setLoadingDetailId(place.place_id);
            socket.emit('getPlaceDetails', { placeId: place.place_id });
        }
    };

    const mapCenter = places.length > 0 && places[0].geometry?.location
        ? [places[0].geometry.location.lat, places[0].geometry.location.lng]
        : [35.85, -79.56];

    return (
        <Layout user={socket.auth.token} avatar={socket.auth.avatar}>
            <div className="flex w-[90%] lg:w-[80%] mx-auto gap-4 pb-2 pt-4" style={{ height: 'calc(100vh - 120px)' }}>

                {/* Left: restaurant list */}
                <div className="w-[40%] overflow-y-auto rounded-xl bg-white shadow-sm">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <Skeleton className="w-9 h-9 rounded-md shrink-0" />
                                    <Skeleton className="h-4 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {places.map((place) => {
                                const isExpanded = selectedPlaceId === place.place_id;
                                const details = placeDetailsMap[place.place_id];
                                const isLoadingDetails = loadingDetailId === place.place_id;

                                return (
                                    <div key={place.place_id}>
                                        {/* Row */}
                                        <div
                                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#e8f0e8] transition-colors"
                                            onClick={() => handleSelectPlace(place)}
                                        >
                                            <span className="font-medium flex-1 truncate">{place.name}</span>
                                            {isExpanded
                                                ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                            }
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="px-5 pb-5 bg-white space-y-3">
                                                {isLoadingDetails ? (
                                                    <div className="space-y-2 pt-2">
                                                        <Skeleton className="w-full h-36 rounded-lg" />
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-40" />
                                                        <Skeleton className="h-4 w-36" />
                                                    </div>
                                                ) : details && (
                                                    <>
                                                        {details.photos?.[0]?.photo_reference && (
                                                            <img
                                                                src={`http://localhost:8000/api/place-photo?ref=${details.photos[0].photo_reference}`}
                                                                alt={place.name}
                                                                className="w-full h-36 object-cover rounded-lg"
                                                            />
                                                        )}
                                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                            <span className="font-semibold">{details.rating}</span>
                                                            <span className="text-yellow-500">
                                                                {'★'.repeat(Math.round(details.rating))}
                                                                {'☆'.repeat(5 - Math.round(details.rating))}
                                                            </span>
                                                            <span className="text-muted-foreground text-sm">
                                                                ({details.user_ratings_total?.toLocaleString()})
                                                            </span>
                                                            {details.price_level && (
                                                                <span className="ml-auto text-muted-foreground font-medium text-sm">
                                                                    {'$'.repeat(details.price_level)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {details.formatted_address && (
                                                            <div className="flex gap-2 items-start">
                                                                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                                                <span className="text-sm">{details.formatted_address}</span>
                                                            </div>
                                                        )}
                                                        {details.opening_hours && (
                                                            <div className="flex gap-2 items-center">
                                                                <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                <span className={`text-sm font-semibold ${details.opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {details.opening_hours.open_now ? 'Open now' : 'Closed'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {details.formatted_phone_number && (
                                                            <div className="flex gap-2 items-center">
                                                                <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                <span className="text-sm">{details.formatted_phone_number}</span>
                                                            </div>
                                                        )}
                                                        {details.website && (
                                                            <div className="flex gap-2 items-center">
                                                                <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                <a href={details.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2d6a2d] hover:underline truncate">
                                                                    {details.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {details.url && (
                                                            <a href={details.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#2d6a2d] hover:underline pt-1">
                                                                <ExternalLink className="w-4 h-4" />
                                                                View on Google Maps
                                                            </a>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Leaflet map */}
                <div className="flex-1 rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <Skeleton className="w-full h-full" />
                    ) : places.length > 0 && (
                        <MapContainer center={mapCenter} zoom={12} className="w-full h-full">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <MapController selectedPlaceId={selectedPlaceId} places={places} />
                            {userLocation && (
                                <Marker position={userLocation} icon={youAreHereIcon} />
                            )}
                            {places.map((place) => (
                                place.geometry?.location && (
                                    <Marker
                                        key={place.place_id}
                                        position={[place.geometry.location.lat, place.geometry.location.lng]}
                                        eventHandlers={{ click: () => handleSelectPlace(place) }}
                                    >
                                        <Popup className="veto-popup" maxWidth={280} minWidth={240}>
                                            {placeDetailsMap[place.place_id]?.photos?.[0]?.photo_reference && (
                                                <img
                                                    src={`http://localhost:8000/api/place-photo?ref=${placeDetailsMap[place.place_id].photos[0].photo_reference}`}
                                                    alt={place.name}
                                                    className="w-full h-32 object-cover"
                                                />
                                            )}
                                            <div className="p-4 space-y-2">
                                                <p className="font-bold text-base leading-tight">{place.name}</p>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold text-sm">{place.rating}</span>
                                                    <span className="text-yellow-500 text-sm">
                                                        {'★'.repeat(Math.round(place.rating))}{'☆'.repeat(5 - Math.round(place.rating))}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">({place.user_ratings_total?.toLocaleString()})</span>
                                                    {place.price_level && (
                                                        <span className="text-gray-500 text-xs ml-1">· {'$'.repeat(place.price_level)}</span>
                                                    )}
                                                </div>
                                                {place.formatted_address && (
                                                    <div className="flex gap-2 items-start">
                                                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                                                        <span className="text-xs text-gray-600">{place.formatted_address}</span>
                                                    </div>
                                                )}
                                                {placeDetailsMap[place.place_id]?.opening_hours && (
                                                    <div className="flex gap-2 items-center">
                                                        <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                        <span className={`text-sm font-medium ${placeDetailsMap[place.place_id].opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                                            {placeDetailsMap[place.place_id].opening_hours.open_now ? 'Open now' : 'Closed'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
                        </MapContainer>
                    )}
                </div>

            </div>

        </Layout>
    );
};
