import { Download, Eye, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ResourceCardProps {
  resource: {
    id: string;
    resource_title: string;
    subject_name: string;
    resource_type: string;
    file_url: string;
    download_count: number;
    rating_average: number | null;
    rating_count: number | null;
    upload_date: string;
    user_id: string;
  };
}

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  Notes: 'bg-blue-100 text-blue-700',
  Summary: 'bg-green-100 text-green-700',
  Diagram: 'bg-purple-100 text-purple-700',
  Worksheet: 'bg-orange-100 text-orange-700',
  'Cheat Sheet': 'bg-yellow-100 text-yellow-700',
  Flashcards: 'bg-red-100 text-red-700'
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#3B82F6',
  'Physical Sciences': '#9333EA',
  'Life Sciences': '#10B981',
  English: '#EF4444',
  Afrikaans: '#F97316',
  History: '#92400E',
  Geography: '#14B8A6',
  'Business Studies': '#D4AF37',
  Accounting: '#1E3A8A',
  Economics: '#059669'
};

export default function ResourceCard({ resource }: ResourceCardProps) {
  const navigate = useNavigate();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.file_url, '_blank');
  };

  return (
    <div
      onClick={() => navigate(`/community/resources/${resource.id}`)}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-t-4 overflow-hidden"
      style={{ borderTopColor: SUBJECT_COLORS[resource.subject_name] || '#6B7280' }}
    >
      {/* Preview Thumbnail */}
      <div className="h-48 bg-gray-100 flex items-center justify-center">
        <div className="text-center p-4">
          <div
            className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-2"
            style={{ backgroundColor: SUBJECT_COLORS[resource.subject_name] || '#6B7280' }}
          >
            {resource.subject_name[0]}
          </div>
          <p className="text-xs text-gray-500">Click to preview</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-primary line-clamp-2 mb-2">
          {resource.resource_title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100">
            {resource.subject_name}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              RESOURCE_TYPE_COLORS[resource.resource_type] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {resource.resource_type}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <span className="truncate">Shared by student</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>{formatDistanceToNow(new Date(resource.upload_date), { addSuffix: true })}</span>
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {resource.download_count}
          </span>
        </div>

        {/* Rating */}
        {resource.rating_average !== null && resource.rating_count && resource.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-3 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{resource.rating_average.toFixed(1)}</span>
            <span className="text-gray-500">({resource.rating_count})</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={e => {
              e.stopPropagation();
              navigate(`/community/resources/${resource.id}`);
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-secondary hover:bg-secondary/90"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
