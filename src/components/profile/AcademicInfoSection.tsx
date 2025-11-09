import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GradeSelector } from './GradeSelector';
import { SchoolSelector } from './SchoolSelector';
import { StudyPreferencesForm } from './StudyPreferencesForm';
import { ReportUpload } from '@/components/settings/ReportUpload';
import { GraduationCap } from 'lucide-react';

interface AcademicInfoSectionProps {
  userProfile: any;
  userId: string;
}

export const AcademicInfoSection = ({ userProfile, userId }: AcademicInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Information
          </CardTitle>
          <CardDescription>Manage your grade level, school, and study preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <GradeSelector 
            userId={userId}
            currentGrade={userProfile.grade_level}
            currentSchoolId={userProfile.school_id}
          />
          
          <SchoolSelector
            userId={userId}
            currentSchoolId={userProfile.school_id}
            currentGrade={userProfile.grade_level}
          />
        </CardContent>
      </Card>

      <StudyPreferencesForm userId={userId} />

      <ReportUpload userId={userId} />
    </div>
  );
};
