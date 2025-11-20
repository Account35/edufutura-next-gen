import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, BookOpen, Video, FileText, GraduationCap, Search } from 'lucide-react';

const resources = [
  {
    category: 'articles',
    title: 'Guide to Choosing Your Career Path',
    description: 'Comprehensive guide to understanding your interests, skills, and career options in South Africa.',
    url: 'https://www.careerhelp.org.za',
    tags: ['Career Planning', 'Decision Making'],
  },
  {
    category: 'articles',
    title: 'South African Scarce Skills List 2024',
    description: 'Official list of in-demand careers and skills in South Africa.',
    url: 'https://www.dhet.gov.za',
    tags: ['Skills', 'Job Market'],
  },
  {
    category: 'videos',
    title: 'Day in the Life: Software Developer',
    description: 'Follow a South African software developer through their typical workday.',
    url: 'https://youtube.com',
    tags: ['Technology', 'Day in Life'],
  },
  {
    category: 'videos',
    title: 'Becoming a Doctor in South Africa',
    description: 'Complete guide to medical school applications, training, and career path.',
    url: 'https://youtube.com',
    tags: ['Healthcare', 'Medical'],
  },
  {
    category: 'courses',
    title: 'Introduction to Programming',
    description: 'Free online course teaching Python programming fundamentals.',
    url: 'https://www.coursera.org',
    tags: ['Technology', 'Skills Development'],
  },
  {
    category: 'courses',
    title: 'Business Management Fundamentals',
    description: 'Learn essential business and management skills online.',
    url: 'https://www.udemy.com',
    tags: ['Business', 'Management'],
  },
  {
    category: 'reports',
    title: 'South African Labour Market Analysis',
    description: 'Quarterly report on employment trends and job market outlook.',
    url: 'https://www.statssa.gov.za',
    tags: ['Job Market', 'Research'],
  },
  {
    category: 'reports',
    title: 'SETA Skills Development Report',
    description: 'Analysis of skills needs across different sectors.',
    url: 'https://www.dhet.gov.za',
    tags: ['Skills', 'Development'],
  },
  {
    category: 'government',
    title: 'Department of Higher Education',
    description: 'Official government portal for tertiary education information.',
    url: 'https://www.dhet.gov.za',
    tags: ['Government', 'Education'],
  },
  {
    category: 'government',
    title: 'National Student Financial Aid Scheme',
    description: 'Apply for NSFAS funding and manage your student loan.',
    url: 'https://www.nsfas.org.za',
    tags: ['Funding', 'Financial Aid'],
  },
];

const categoryIcons = {
  articles: BookOpen,
  videos: Video,
  courses: GraduationCap,
  reports: FileText,
  government: ExternalLink,
};

const categoryLabels = {
  articles: 'Articles & Guides',
  videos: 'Videos',
  courses: 'Online Courses',
  reports: 'Industry Reports',
  government: 'Government Resources',
};

export default function CareerResources() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Career Resources</h1>
          <p className="text-muted-foreground">
            Curated articles, videos, courses, and tools to help you explore and plan your career
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="government">Government</TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="space-y-4 mt-6">
            {filteredResources.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No resources found matching your search.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredResources.map((resource, index) => {
                  const Icon = categoryIcons[resource.category as keyof typeof categoryIcons];
                  
                  return (
                    <Card key={index} className="hover-scale">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="h-4 w-4 text-secondary" />
                              <Badge variant="secondary" className="text-xs">
                                {categoryLabels[resource.category as keyof typeof categoryLabels]}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg">{resource.title}</CardTitle>
                            <CardDescription className="mt-2">
                              {resource.description}
                            </CardDescription>
                          </div>
                          <Button size="icon" variant="ghost" asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Learning Paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-secondary">1</span>
              </div>
              <div>
                <p className="font-semibold">Explore Career Options</p>
                <p className="text-sm text-muted-foreground">Read articles and watch videos about different careers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-secondary">2</span>
              </div>
              <div>
                <p className="font-semibold">Develop Relevant Skills</p>
                <p className="text-sm text-muted-foreground">Take online courses to build skills for your chosen career</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-secondary">3</span>
              </div>
              <div>
                <p className="font-semibold">Research Institutions</p>
                <p className="text-sm text-muted-foreground">Use government resources to find suitable universities and funding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
