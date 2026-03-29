import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "@/SocketContext";
import { Layout } from "./Layout";
import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { MapPin, Clock, Phone, Globe, ExternalLink } from "lucide-react"


export const Results = () => {

    const { socket } = useSocket();
    const { code } = useParams();

    const [places, setPlaces] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedPlace, setSelectedPlace] = useState(null)
    const [placeDetails, setPlaceDetails] = useState(null)
    const [detailsLoading, setDetailsLoading] = useState(false)

    const ITEMS_PER_PAGE = 10


    if (!socket) {
        console.error('Socket is not initialized..');
        return;
    }

    useEffect(() => {

        // gets the results
        socket.on('getPlaces', (places) => {
            setPlaces(places);
            setCurrentPage(1);
            setLoading(false);
        });

        socket.on('placeDetails', (details) => {
            setPlaceDetails(details);
            setDetailsLoading(false);
        });

    }, [code, socket]);

    return (
        <Layout user={socket.auth.token} avatar={socket.auth.avatar}>
            <div className="w-[90%] lg:w-[80%] rounded-xl mx-auto p-4 pt-6">
                <Field className="w-full">
                    <FieldLabel htmlFor="progress-poll">
                        <span class="text-md">Poll Completed !</span>
                    </FieldLabel>
                    <Progress value={100} id="progress-poll" />
                </Field>
            </div>

            <div className={"w-[90%] lg:w-[80%] bg-gray-100 rounded-xl mx-auto p-8 shadow-md"}>
                <Card x-chunk={"dashboard-06-chunk-0"}>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
                        <CardDescription>A list of your recommendations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px] text-center"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="w-10 h-10 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : places
                                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                    .map((place, pageIndex) => {
                                        const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + pageIndex;
                                        const rankStyles = [
                                            { bg: 'bg-gradient-to-r from-amber-200 to-yellow-500', size: 'text-2xl' },
                                            { bg: 'bg-gradient-to-r from-slate-300 to-slate-500',  size: 'text-xl'  },
                                            { bg: 'bg-gradient-to-r from-emerald-500 to-emerald-900', size: 'text-xl' },
                                        ];
                                        const isTop3 = globalIndex < 3;
                                        const rank = rankStyles[globalIndex];
                                        return (
                                            <TableRow key={place.place_id} onClick={() => { setSelectedPlace(place); setPlaceDetails(null); setDetailsLoading(true); socket.emit('getPlaceDetails', { placeId: place.place_id }); }} className="cursor-pointer">
                                                <TableCell className="text-center">
                                                    {isTop3 ? (
                                                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-md font-bold ${rank.size} ${rank.bg}`}>
                                                            {globalIndex + 1}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">{globalIndex + 1}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{place.name}</TableCell>
                                                <TableCell>{place.formatted_address}</TableCell>
                                                <TableCell>{place.rating}</TableCell>
                                                <TableCell>{'$'.repeat(place.price_level) || ''}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        {!loading && Math.ceil(places.length / ITEMS_PER_PAGE) > 1 && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: Math.ceil(places.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(i + 1)}
                                                isActive={currentPage === i + 1}
                                                className="cursor-pointer"
                                            >
                                                {i + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(places.length / ITEMS_PER_PAGE), p + 1))}
                                            className={currentPage === Math.ceil(places.length / ITEMS_PER_PAGE) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </CardFooter>

                </Card>
            </div>
            <Dialog open={!!selectedPlace} onOpenChange={(open) => !open && setSelectedPlace(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby={undefined}>
                    <DialogTitle className="sr-only">{selectedPlace?.name}</DialogTitle>
                    <div className="flex h-[500px]">
                        {/* Details panel */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                            <h2 className="text-lg font-bold leading-tight">{selectedPlace?.name}</h2>
                            {detailsLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-36" />
                                </div>
                            ) : placeDetails && (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold">{placeDetails.rating}</span>
                                        <span className="text-yellow-500">
                                            {'★'.repeat(Math.round(placeDetails.rating))}{'☆'.repeat(5 - Math.round(placeDetails.rating))}
                                        </span>
                                        <span className="text-muted-foreground text-sm">({placeDetails.user_ratings_total?.toLocaleString()})</span>
                                        {placeDetails.price_level && (
                                            <span className="ml-auto text-muted-foreground font-medium">{'$'.repeat(placeDetails.price_level)}</span>
                                        )}
                                    </div>
                                    {placeDetails.formatted_address && (
                                        <div className="flex gap-3 items-start">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                            <span className="text-sm">{placeDetails.formatted_address}</span>
                                        </div>
                                    )}
                                    {placeDetails.opening_hours && (
                                        <div className="flex gap-3 items-center">
                                            <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                                            <span className={`text-sm font-semibold ${placeDetails.opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                                {placeDetails.opening_hours.open_now ? 'Open now' : 'Closed'}
                                            </span>
                                        </div>
                                    )}
                                    {placeDetails.formatted_phone_number && (
                                        <div className="flex gap-3 items-center">
                                            <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                                            <span className="text-sm">{placeDetails.formatted_phone_number}</span>
                                        </div>
                                    )}
                                    {placeDetails.website && (
                                        <div className="flex gap-3 items-center">
                                            <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                                            <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                                                {placeDetails.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                            </a>
                                        </div>
                                    )}
                                    {placeDetails.url && (
                                        <a href={placeDetails.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-auto">
                                            <ExternalLink className="w-4 h-4" />
                                            View on Google Maps
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                        {/* Map */}
                        <div className="w-[60%] shrink-0">
                            {selectedPlace && (
                                <iframe
                                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_MAPS_KEY}&q=place_id:${selectedPlace.place_id}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Layout>
    )
};
