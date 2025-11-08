# Mobile UX & Error Handling Guide

## Overview
EduFutura is built with a mobile-first approach, optimized for South African students who primarily access the platform through smartphones. This guide documents all mobile optimizations and error handling implementations.

## Mobile Optimizations

### Touch Targets
All interactive elements meet the minimum 44x44px touch target requirement:

- **Buttons**: `min-h-[44px]` applied to all button variants
- **Inputs**: `min-h-[44px]` for comfortable typing
- **Checkboxes**: Increased from 16x16px to 20x20px with adequate padding
- **Icon Buttons**: Minimum 44x44px touch area even for small icons

### Input Optimization

#### Mobile-Specific Input Types
```tsx
// Email inputs
<Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" />

// Phone numbers
<Input type="tel" inputMode="tel" autoComplete="tel" />

// Numeric inputs
<Input type="number" inputMode="numeric" />

// Search fields
<Input type="search" inputMode="search" />
```

#### Auto-complete Attributes
- `autoComplete="email"` - Email fields
- `autoComplete="name"` - Full name fields
- `autoComplete="tel"` - Phone number fields
- `autoComplete="current-password"` - Login password
- `autoComplete="new-password"` - Registration password

### Responsive Design

#### Viewport Configuration
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
```
- Allows up to 5x zoom for accessibility
- Prevents auto-zoom on input focus
- Enables manual zooming for users with visual impairments

#### Responsive Layout Classes
- Base classes for mobile (320px+)
- `sm:` breakpoint at 640px
- `md:` breakpoint at 768px
- `lg:` breakpoint at 1024px
- `xl:` breakpoint at 1280px

### Full-Screen Modals on Mobile
Dialog components automatically become full-screen on mobile devices:
```tsx
className="... md:max-h-[90vh] overflow-y-auto sm:rounded-lg"
```

## Error Handling System

### Global Error Boundary
Catches unhandled React errors and displays a user-friendly recovery screen:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Features:**
- Friendly error message
- Reload button for quick recovery
- Error details in development mode
- Automatic error logging (ready for Sentry integration)

### Network Status Detection
Real-time network status monitoring with persistent banner:

```tsx
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const isOnline = useNetworkStatus();
```

**Displays:**
- Yellow banner when offline: "You're offline - some features may not work"
- Success toast when reconnected
- Automatic detection using `navigator.onLine`

### Toast Notifications

#### Color-Coded Messages
```tsx
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '@/utils/toast-helpers';

// Success (green)
showSuccessToast('Profile updated successfully!');

// Error (red)
showErrorToast('Failed to save changes', 'Please try again');

// Warning (yellow)
showWarningToast('Your session will expire in 2 minutes');

// Info (blue)
showInfoToast('New curriculum content available');
```

### Loading States

#### Loading Spinner
```tsx
import { LoadingSpinner } from '@/components/ui/loading';

<LoadingSpinner size="sm" />  // Small
<LoadingSpinner size="md" />  // Medium (default)
<LoadingSpinner size="lg" />  // Large
```

#### Full-Page Loader
```tsx
import { FullPageLoader } from '@/components/ui/loading';

<FullPageLoader message="Loading your dashboard..." />
```

#### Skeleton Screens
```tsx
import { Skeleton, CardSkeleton, ListSkeleton } from '@/components/ui/loading';

<CardSkeleton />              // Single card placeholder
<ListSkeleton items={3} />    // List with 3 items
<Skeleton className="h-4 w-3/4" />  // Custom skeleton
```

#### Button Loading State
```tsx
import { ButtonLoading } from '@/components/ui/loading';

<Button disabled={isLoading}>
  <ButtonLoading isLoading={isLoading} loadingText="Saving...">
    Save Changes
  </ButtonLoading>
</Button>
```

### Progress Bars
For file uploads and long operations:

```tsx
import { ProgressBar } from '@/components/ui/progress-bar';

<ProgressBar 
  progress={67} 
  label="Uploading profile picture..."
  showPercentage={true}
/>
```

### Empty States
User-friendly placeholders when no data exists:

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen } from 'lucide-react';

<EmptyState
  icon={BookOpen}
  title="No quizzes yet"
  description="You haven't taken any quizzes yet - start practicing to track your progress"
  action={{
    label: "Browse Quizzes",
    onClick: () => navigate('/quizzes')
  }}
/>
```

### Confirmation Dialogs
For destructive or important actions:

```tsx
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

<ConfirmationDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleLogout}
  title="Are you sure you want to log out?"
  description="You'll need to sign in again to access your account."
  confirmText="Log Out"
  cancelText="Cancel"
  variant="destructive"
/>
```

### Form Validation
Inline error messages with clear guidance:

```tsx
import { FormError, FormField } from '@/components/ui/form-error';

<FormField
  label="Email Address"
  htmlFor="email"
  error={errors.email?.message}
  required
>
  <Input id="email" {...register("email")} />
</FormField>
```

**Validation Messages:**
- Email: "Please enter a valid email address like name@example.com"
- Password: "Password must be at least 8 characters with uppercase, lowercase, and numbers"
- Phone: "Enter a valid SA mobile number (10 digits)"
- Required: "This field is required"

### API Request Handling
Automatic timeout detection and retry logic:

```tsx
import { apiRequest, retryRequest } from '@/lib/api-helpers';

// Single request with 30s timeout
const data = await apiRequest('/api/users');

// Retry up to 3 times with exponential backoff
const data = await retryRequest(() => apiRequest('/api/users'));
```

**Features:**
- 30-second timeout by default
- Automatic offline detection
- User-friendly error messages
- Retry mechanism with exponential backoff

### Form Submission Protection
Prevents double-submission and provides loading feedback:

```tsx
import { useFormSubmission } from '@/hooks/useFormSubmission';

const { isSubmitting, handleSubmit } = useFormSubmission({
  successMessage: 'Profile updated successfully!',
  errorMessage: 'Failed to update profile',
  onSuccess: () => navigate('/dashboard'),
});

const onSubmit = async (data) => {
  await handleSubmit(async () => {
    return await updateProfile(data);
  });
};
```

## Best Practices

### Mobile Forms
1. ✅ Use single-column layouts
2. ✅ Add generous spacing between fields (gap-4 or gap-6)
3. ✅ Use appropriate input types for mobile keyboards
4. ✅ Disable auto-capitalization on email/username fields
5. ✅ Enable auto-complete for faster form filling
6. ✅ Provide clear labels and placeholders
7. ✅ Show inline validation errors immediately

### Touch Interactions
1. ✅ Minimum 44x44px touch targets
2. ✅ Adequate spacing between interactive elements
3. ✅ Visual feedback on touch (hover states)
4. ✅ Consider thumb-reach zones on large phones
5. ✅ Test on actual devices, not just browser dev tools

### Performance
1. ✅ Use skeleton screens for data loading
2. ✅ Lazy load images below the fold
3. ✅ Optimize images with responsive srcset
4. ✅ Show loading indicators for async operations
5. ✅ Cache data when possible for offline access

### Error Communication
1. ✅ Use color-coded toasts (red=error, yellow=warning, green=success)
2. ✅ Provide actionable error messages with next steps
3. ✅ Show retry options for failed requests
4. ✅ Display persistent banners for offline status
5. ✅ Log errors for debugging (development mode)

## Testing Checklist

### Mobile Devices to Test
- [ ] Budget Android (Samsung Galaxy A series, Xiaomi)
- [ ] Mid-range phones (iPhone SE, Pixel 6a)
- [ ] High-end phones (iPhone 14, Samsung S23)
- [ ] Tablets (iPad, Samsung Tab)
- [ ] Desktop browsers (Chrome, Safari, Firefox)

### Touch Target Verification
- [ ] All buttons are tappable without zooming
- [ ] Checkbox/radio inputs have adequate hit area
- [ ] Form inputs don't require precision tapping
- [ ] Icon buttons have minimum 44x44px area
- [ ] Links in text have adequate spacing

### Form Experience
- [ ] Correct mobile keyboard for each input type
- [ ] No auto-zoom on input focus
- [ ] Validation errors are clearly visible
- [ ] Submit buttons disable during submission
- [ ] Success/error feedback is immediate

### Network Handling
- [ ] Offline banner appears when disconnected
- [ ] Requests timeout appropriately
- [ ] Retry options work as expected
- [ ] Cached data loads while offline
- [ ] Reconnection is detected automatically

### Error Scenarios
- [ ] Error boundary catches unhandled errors
- [ ] Network failures show helpful messages
- [ ] Form validation provides clear guidance
- [ ] Empty states guide users appropriately
- [ ] Confirmation dialogs prevent accidental actions

## Component Examples

See `/src/components/` for implementation details:
- `ErrorBoundary.tsx` - Global error catching
- `NetworkStatusBanner.tsx` - Offline detection
- `ui/loading.tsx` - Loading states
- `ui/empty-state.tsx` - Empty state placeholders
- `ui/confirmation-dialog.tsx` - Confirmation modals
- `ui/form-error.tsx` - Form validation feedback
- `ui/progress-bar.tsx` - Upload progress

## Future Enhancements
- [ ] Swipe gestures for navigation
- [ ] Pull-to-refresh for content updates
- [ ] Offline mode with service workers
- [ ] Push notifications for mobile
- [ ] Biometric authentication
- [ ] Progressive Web App (PWA) installability
