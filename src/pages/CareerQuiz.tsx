import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  type: 'scenario' | 'priority' | 'environment';
  options: {
    text: string;
    weight: Record<string, number>;
  }[];
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    type: 'scenario',
    question: 'In your free time, you most enjoy:',
    options: [
      { text: 'Solving complex puzzles and brain teasers', weight: { technology: 3, science: 2, engineering: 2 } },
      { text: 'Creating art, music, or writing', weight: { arts: 3, education: 1 } },
      { text: 'Helping friends with their problems', weight: { healthcare: 2, education: 2, law: 1 } },
      { text: 'Building or fixing things with your hands', weight: { engineering: 3, technology: 1 } },
    ],
  },
  {
    id: 2,
    type: 'environment',
    question: 'Your ideal work environment is:',
    options: [
      { text: 'A modern office with the latest technology', weight: { technology: 3, business: 2 } },
      { text: 'Outdoors or in the field', weight: { science: 2, engineering: 2 } },
      { text: 'In a hospital, clinic, or care facility', weight: { healthcare: 3 } },
      { text: 'A creative studio or workshop', weight: { arts: 3, technology: 1 } },
    ],
  },
  {
    id: 3,
    type: 'scenario',
    question: 'When working on a group project, you prefer to:',
    options: [
      { text: 'Lead the team and make key decisions', weight: { business: 3, law: 2 } },
      { text: 'Handle the technical or detailed work', weight: { technology: 2, science: 2, engineering: 2 } },
      { text: 'Ensure everyone is working well together', weight: { education: 2, healthcare: 1 } },
      { text: 'Come up with creative solutions', weight: { arts: 2, technology: 2 } },
    ],
  },
  {
    id: 4,
    type: 'priority',
    question: 'What matters most to you in a career?',
    options: [
      { text: 'High earning potential and financial security', weight: { business: 2, technology: 2, law: 3 } },
      { text: 'Making a positive impact on society', weight: { healthcare: 3, education: 3, science: 1 } },
      { text: 'Creative freedom and self-expression', weight: { arts: 3 } },
      { text: 'Job stability and clear career progression', weight: { business: 2, law: 2 } },
    ],
  },
  {
    id: 5,
    type: 'scenario',
    question: 'Your best school subjects are:',
    options: [
      { text: 'Mathematics and Physical Sciences', weight: { technology: 3, engineering: 3, science: 2 } },
      { text: 'Life Sciences and Biology', weight: { healthcare: 3, science: 2 } },
      { text: 'Languages and Social Sciences', weight: { education: 2, arts: 2, law: 2 } },
      { text: 'Business Studies and Economics', weight: { business: 3, law: 1 } },
    ],
  },
];

const careerCategories = {
  technology: { name: 'Technology', color: 'bg-blue-500', careers: ['Software Developer', 'Data Scientist', 'IT Manager'] },
  engineering: { name: 'Engineering', color: 'bg-purple-500', careers: ['Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer'] },
  healthcare: { name: 'Healthcare', color: 'bg-green-500', careers: ['Doctor', 'Nurse', 'Physiotherapist'] },
  business: { name: 'Business', color: 'bg-yellow-600', careers: ['Accountant', 'Financial Analyst', 'Marketing Manager'] },
  education: { name: 'Education', color: 'bg-orange-500', careers: ['Teacher', 'Educational Psychologist', 'Lecturer'] },
  arts: { name: 'Arts & Media', color: 'bg-pink-500', careers: ['Graphic Designer', 'Journalist', 'Photographer'] },
  science: { name: 'Science', color: 'bg-teal-500', careers: ['Research Scientist', 'Environmental Consultant', 'Lab Technician'] },
  law: { name: 'Law & Justice', color: 'bg-indigo-500', careers: ['Lawyer', 'Paralegal', 'Judge'] },
};

export default function CareerQuiz() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  const handleAnswer = (optionIndex: number) => {
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = () => {
    const scores: Record<string, number> = {};
    
    Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
      const question = quizQuestions[parseInt(questionIndex)];
      const weights = question.options[optionIndex].weight;
      
      Object.entries(weights).forEach(([category, weight]) => {
        scores[category] = (scores[category] || 0) + weight;
      });
    });

    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, score]) => ({
        category,
        score,
        ...careerCategories[category as keyof typeof careerCategories],
      }));
  };

  if (showResults) {
    const results = calculateResults();
    
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-3xl font-serif">Your Career Profile</CardTitle>
              <CardDescription>
                Based on your responses, here are careers that match your interests and strengths
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {results.map((result, index) => (
                <Card key={result.category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${result.color} text-white`}>
                          #{index + 1} Match
                        </Badge>
                        <CardTitle className="text-xl">{result.name}</CardTitle>
                      </div>
                      <span className="text-2xl font-bold text-secondary">
                        {Math.round((result.score / 15) * 100)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Example Careers:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.careers.map((career) => (
                            <Badge key={career} variant="outline">
                              {career}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Next Steps:</p>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          <li>Research careers in {result.name.toLowerCase()}</li>
                          <li>Focus on relevant school subjects</li>
                          <li>Explore universities offering related programs</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-3">
                <Button onClick={() => navigate('/career-guidance/universities')} className="flex-1">
                  Explore Universities
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                  Retake Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const question = quizQuestions[currentQuestion];
  const selectedAnswer = answers[currentQuestion];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-secondary" />
              <CardTitle className="font-serif">Career Explorer Quiz</CardTitle>
            </div>
            <CardDescription>
              Question {currentQuestion + 1} of {quizQuestions.length}
            </CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
              <RadioGroup value={selectedAnswer?.toString()} onValueChange={(val) => handleAnswer(parseInt(val))}>
                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label 
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedAnswer === undefined}
                className="flex-1"
              >
                {currentQuestion === quizQuestions.length - 1 ? 'View Results' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
