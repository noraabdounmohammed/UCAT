import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileQuestion, Settings, Shield } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Question Manager',
      description: 'Add, edit, and delete individual questions in the question bank',
      icon: <FileQuestion className="h-8 w-8" />,
      path: '/admin/QuestionManager',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Question Editor',
      description: 'Edit all questions in JSON format with advanced filtering',
      icon: <FileQuestion className="h-8 w-8" />,
      path: '/admin/QuestionEditor',
      color: 'bg-indigo-100 text-indigo-700'
    },
    {
      title: 'Topic Manager',
      description: 'Manage topics, micro-skills, and their structure',
      icon: <Database className="h-8 w-8" />,
      path: '/admin/TopicManager',
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Settings',
      description: 'Configure application settings and defaults',
      icon: <Settings className="h-8 w-8" />,
      path: '/admin/Settings',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: <Shield className="h-8 w-8" />,
      path: '/admin/UserManagement',
      color: 'bg-amber-100 text-amber-700'
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your application content and settings
          </p>
        </div>
        <Button onClick={() => navigate('/')}>
          Back to Application
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminModules.map((module) => (
          <Card key={module.title} className="overflow-hidden">
            <CardHeader className={`${module.color} p-4`}>
              <div className="flex items-center gap-3">
                {module.icon}
                <CardTitle>{module.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <CardDescription className="text-sm min-h-[40px]">
                {module.description}
              </CardDescription>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => navigate(module.path)}
              >
                Access Module
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 border rounded-lg bg-muted/20">
        <h2 className="text-xl font-semibold mb-4">Admin Information</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Question Bank Status:</span> 2,145 questions across 18 topics
          </p>
          <p>
            <span className="font-medium">Last Updated:</span> May 16, 2025
          </p>
          <p>
            <span className="font-medium">System Version:</span> 1.2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
