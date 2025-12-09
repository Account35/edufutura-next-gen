import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { FullPageLoader } from '@/components/ui/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  FileQuestion, 
  Shield, 
  Settings, 
  BarChart3,
  MessageSquare,
  Briefcase,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const adminMenuItems = [
  {
    title: 'Content Management',
    description: 'Manage curriculum chapters, subjects, and learning materials',
    icon: BookOpen,
    href: '/admin/content',
    color: 'bg-blue-500/10 text-blue-600'
  },
  {
    title: 'Quiz Management',
    description: 'Create, edit, and manage assessment quizzes',
    icon: FileQuestion,
    href: '/admin/quizzes',
    color: 'bg-purple-500/10 text-purple-600'
  },
  {
    title: 'Content Moderation',
    description: 'Review flagged content and manage community posts',
    icon: Shield,
    href: '/admin/moderation',
    color: 'bg-red-500/10 text-red-600'
  },
  {
    title: 'Job Monitoring',
    description: 'Monitor background jobs and system tasks',
    icon: Settings,
    href: '/admin/jobs',
    color: 'bg-orange-500/10 text-orange-600'
  },
  {
    title: 'User Analytics',
    description: 'View platform usage statistics and user insights',
    icon: BarChart3,
    href: '/admin/analytics',
    color: 'bg-green-500/10 text-green-600'
  },
  {
    title: 'Forum Management',
    description: 'Manage discussion forums and community guidelines',
    icon: MessageSquare,
    href: '/community/forums',
    color: 'bg-teal-500/10 text-teal-600'
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin && !isEducator) {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, isEducator, authLoading, roleLoading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading || roleLoading) {
    return <FullPageLoader message="Loading admin dashboard..." />;
  }

  if (!isAdmin && !isEducator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EduFutura Admin</h1>
                <p className="text-sm opacity-80">
                  {isAdmin ? 'Administrator' : 'Educator'} Panel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/dashboard')}
              >
                <Users className="w-4 h-4 mr-2" />
                Student View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">
            Welcome to Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage your educational platform from here. Select a section below to get started.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-primary">--</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Quizzes</p>
                  <p className="text-2xl font-bold text-primary">--</p>
                </div>
                <FileQuestion className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chapters</p>
                  <p className="text-2xl font-bold text-primary">--</p>
                </div>
                <BookOpen className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  <p className="text-2xl font-bold text-primary">--</p>
                </div>
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2 hover:border-secondary">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-2`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-primary mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/admin/quizzes/create')}>
              <FileQuestion className="w-4 h-4 mr-2" />
              Create New Quiz
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/content')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Add Content
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/moderation')}>
              <Shield className="w-4 h-4 mr-2" />
              Review Content
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
