import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, BookOpen } from "lucide-react";
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface ModuleCardProps {
    number: number;
    title: string;
    description: string;
    duration: string;
    lessons: number;
}

const text = getPublicUiExtraTextGetter('es-CO');

export function ModuleCard({ number, title, description, duration, lessons }: ModuleCardProps) {
    return (
        <Card className="h-full border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {text('moduleCardModule')} {number}
                    </Badge>
                    <div className="flex items-center text-xs text-slate-500 gap-3">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {duration}
                        </span>
                        <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {lessons} {text('moduleCardClasses')}
                        </span>
                    </div>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 text-sm leading-relaxed">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
