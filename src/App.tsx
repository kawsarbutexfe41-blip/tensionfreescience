import React, { useState, useEffect } from 'react';
import { SubjectInfo, ExamSessionConfig, ExamResult, UserProfile, MCQ } from './types/quiz.js';
import { AuthUser } from './types/auth.js';
import { ThemeId } from './types/theme.js';
import { SUBJECTS } from './data/subjects.js';
import mcqsData from './data/mcqs.json';
import { selectExamQuestions } from './utils/quizLogic.js';
import { getUserProfile, saveUserProfile, recordExamCompletion, DEFAULT_USER_PROFILE } from './utils/storage.js';
import { getCurrentUser, logoutUser, checkRedirectResult } from './utils/auth.js';

// Modular Components
import { Navbar } from './components/Navbar.js';
import { HomePage } from './components/HomePage.js';
import { VideosPage } from './components/VideosPage.js';
import { LoginPage } from './components/LoginPage.js';
import { RegisterPage } from './components/RegisterPage.js';
import { VerifyOtpPage } from './components/VerifyOtpPage.js';
import { ForgotPasswordModal } from './components/ForgotPasswordModal.js';
import { ExamSetupModal } from './components/ExamSetupModal.js';
import { ExamHall } from './components/ExamHall.js';
import { ResultPage } from './components/ResultPage.js';
import { LeaderboardPage } from './components/LeaderboardPage.js';
import { ProfileModal } from './components/ProfileModal.js';
import { Youtube, FlaskConical } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('light');

  // Navigation view router
  const [currentView, setCurrentView] = useState<
    'home' | 'videos' | 'exam' | 'result' | 'leaderboard' | 'login' | 'register' | 'verify-otp'
  >('home');

  const [otpVerifyEmail, setOtpVerifyEmail] = useState('');
  const [redirectMessage, setRedirectMessage] = useState<string | undefined>(undefined);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Active Exam state
  const [activeQuestions, setActiveQuestions] = useState<MCQ[]>([]);
  const [activeConfig, setActiveConfig] = useState<ExamSessionConfig | null>(null);
  const [latestResult, setLatestResult] = useState<ExamResult | null>(null);

  // 1. Initialize Theme from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('tfs_theme') as ThemeId) || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.className = `theme-${savedTheme}`;
  }, []);

  const handleThemeChange = (newTheme: ThemeId) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('tfs_theme', newTheme);
    document.documentElement.className = `theme-${newTheme}`;
  };

  // 2. Initialize Auth state and User Profile
  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      setAuthUser(current);
      const loaded = getUserProfile();
      setUser({
        ...loaded,
        name: current.name,
        school: current.school || loaded.school
      });
    } else {
      const loaded = getUserProfile();
      setUser(loaded);
    }

    // Check if returning from Google OAuth redirect flow
    checkRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setAuthUser(redirectUser);
        setUser((prev) => ({
          ...prev,
          name: redirectUser.name,
          school: redirectUser.school || prev.school
        }));
      }
    });
  }, []);

  // Quick Start Gated by Auth
  const handleQuickStart = () => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
      setCurrentView('login');
      return;
    }
    const quickSub = SUBJECTS.find((s) => s.id === 'physics') || SUBJECTS[0];
    setSelectedSubject(quickSub);
    setIsSetupOpen(true);
  };

  // Subject Selection Gated by Auth
  const handleSelectSubject = (subject: SubjectInfo) => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
      setCurrentView('login');
      return;
    }
    setSelectedSubject(subject);
    setIsSetupOpen(true);
  };

  // Start Exam flow
  const handleStartExam = (config: ExamSessionConfig) => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা শুরু করার জন্য অনুগ্রহ করে লগইন করুন।');
      setCurrentView('login');
      return;
    }

    setIsSetupOpen(false);
    const examQuestions = selectExamQuestions(
      mcqsData as MCQ[],
      config.subject,
      config.chapter,
      config.questionCount,
      user.attemptedIds,
      config.selectedChapters
    );

    setActiveQuestions(examQuestions);
    setActiveConfig(config);
    setCurrentView('exam');
  };

  // Finish exam flow
  const handleFinishExam = (result: ExamResult) => {
    const updatedUser = recordExamCompletion(result);
    setUser(updatedUser);
    setLatestResult(result);
    setCurrentView('result');
  };

  // Retake exam with fresh questions
  const handleRetakeExam = () => {
    if (activeConfig && selectedSubject) {
      handleStartExam(activeConfig);
    } else if (latestResult) {
      const subjectObj = SUBJECTS.find((s) => s.name === latestResult.subject) || SUBJECTS[0];
      setSelectedSubject(subjectObj);
      handleStartExam({
        subject: latestResult.subject,
        chapter: latestResult.chapter === 'সকল অধ্যায়' ? 'all' : latestResult.chapter,
        questionCount: latestResult.totalQuestions,
        timeLimitSeconds: latestResult.totalQuestions * 60
      });
    } else {
      setCurrentView('home');
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (loggedUser: AuthUser) => {
    setAuthUser(loggedUser);
    setUser((prev) => ({
      ...prev,
      name: loggedUser.name,
      school: loggedUser.school || prev.school
    }));
    setRedirectMessage(undefined);
    setCurrentView('home');
  };

  const handleRegisterSuccess = (registeredUser: AuthUser) => {
    handleLoginSuccess(registeredUser);
  };

  const handleVerifyOtpSuccess = (verifiedUser: AuthUser) => {
    setAuthUser(verifiedUser);
    setUser((prev) => ({
      ...prev,
      name: verifiedUser.name,
      school: verifiedUser.school || prev.school
    }));
    setCurrentView('home');
  };

  const handleLogout = () => {
    logoutUser();
    setAuthUser(null);
    setCurrentView('home');
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setUser(updated);
    saveUserProfile(updated);
  };

  const handleResetData = () => {
    if (window.confirm('তুমি কি সমস্ত পরীক্ষার তথ্য ও এক্সপি রিসেট করতে চাও?')) {
      localStorage.removeItem('class910_livemcq_user_v1');
      setUser(DEFAULT_USER_PROFILE);
      saveUserProfile(DEFAULT_USER_PROFILE);
      setIsProfileOpen(false);
    }
  };

  return (
    <div
      className="min-h-screen font-sans selection:bg-[#6C5CE7] selection:text-white flex flex-col transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-main)' }}
    >
      {/* Navbar is visible on non-exam views */}
      {currentView !== 'exam' && (
        <Navbar
          user={user}
          authUser={authUser}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          currentView={currentView}
          onNavigate={(view) => {
            setRedirectMessage(undefined);
            setCurrentView(view);
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Dynamic View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            user={user}
            isLoggedIn={!!authUser}
            onSelectSubject={handleSelectSubject}
            onQuickStart={handleQuickStart}
            onNavigateVideos={() => setCurrentView('videos')}
            onNavigateLogin={() => {
              setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে লগইন করুন।');
              setCurrentView('login');
            }}
          />
        )}

        {currentView === 'videos' && (
          <VideosPage onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onNavigateRegister={() => setCurrentView('register')}
            onNavigateForgotPassword={() => setIsForgotPasswordOpen(true)}
            onNavigateHome={() => setCurrentView('home')}
            redirectMessage={redirectMessage}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage
            onSuccess={handleRegisterSuccess}
            onNavigateLogin={() => setCurrentView('login')}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'verify-otp' && (
          <VerifyOtpPage
            email={otpVerifyEmail}
            onSuccess={handleVerifyOtpSuccess}
            onNavigateLogin={() => setCurrentView('login')}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'exam' && activeConfig && (
          <ExamHall
            subject={activeConfig.subject}
            chapter={activeConfig.chapter}
            initialQuestions={activeQuestions}
            timeLimitSeconds={activeConfig.timeLimitSeconds}
            onFinishExam={handleFinishExam}
            onExitExam={() => setCurrentView('home')}
          />
        )}

        {currentView === 'result' && latestResult && (
          <ResultPage
            result={latestResult}
            onRetake={handleRetakeExam}
            onViewLeaderboard={() => setCurrentView('leaderboard')}
            onGoHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardPage
            user={user}
            onBack={() => setCurrentView('home')}
            onStartExam={() => {
              if (!authUser) {
                setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
                setCurrentView('login');
              } else {
                const quickSub = SUBJECTS.find((s) => s.id === 'physics') || SUBJECTS[0];
                setSelectedSubject(quickSub);
                setIsSetupOpen(true);
              }
            }}
          />
        )}
      </main>

      {/* Exam Setup Modal */}
      {isSetupOpen && selectedSubject && (
        <ExamSetupModal
          subject={selectedSubject}
          onClose={() => setIsSetupOpen(false)}
          onStartExam={handleStartExam}
        />
      )}

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          onClose={() => setIsForgotPasswordOpen(false)}
          onSuccess={() => {
            setCurrentView('login');
          }}
        />
      )}

      {/* Profile & Stats Modal */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onUpdateProfile={handleUpdateProfile}
          onResetData={handleResetData}
        />
      )}

      {/* Tension Free Science Rebranded Footer */}
      {currentView !== 'exam' && (
        <footer
          className="border-t py-6 text-center text-xs transition-colors"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--card-border)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#6C5CE7]" />
              <span className="font-bold" style={{ color: 'var(--text-main)' }}>Tension Free Science</span>
              <span>—</span>
              <span>ভয় নয়, বিজ্ঞান হবে সহজ</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.youtube.com/@TensionFreeScience"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-red-600 hover:underline font-bold"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>@TensionFreeScience</span>
              </a>
              <p className="text-slate-400">
                © ২০২৬ Tension Free Science. সর্বস্বত্ব সংরক্ষিত।
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
