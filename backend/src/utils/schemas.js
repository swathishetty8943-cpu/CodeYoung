const { z } = require('zod');

// Note: signupSchema deliberately has no `role` field at all - even if a
// client sends one, zod's default `.strip()` behavior drops unknown keys,
// so it can never reach the controller/service.
const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Required: every parent signup asks for a country (see SignupPage.jsx)
  // so we always have a real basis for the stored timezone, since parents
  // and mentors are usually in different timezones and every date shown or
  // emailed depends on getting this right.
  country: z
    .string()
    .trim()
    .min(2, 'Please select your country')
    .max(2, 'Country must be an ISO country code')
    .toUpperCase(),
  timezone: z.string().min(1).optional(),
});

const verifySignupOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Code must be 4 digits'),
});

const resendSignupOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  selectedRole: z.enum(['parent', 'mentor'], {
    errorMap: () => ({ message: 'Please select whether you are a Parent or a Mentor' }),
  }),
});

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  timezone: z.string().min(1).optional(),
  // Optional: Google sign-up is a one-click flow and never shows the
  // country step, but we accept it in case a future client collects it.
  country: z.string().trim().min(2).max(2).toUpperCase().optional(),
});

// Used by the "which country are you in?" prompt shown to a parent the
// first time after they sign up with Google (see authService.setParentCountry).
// 'OTHER' matches the frontend's "Other / not listed" option.
const setCountrySchema = z.object({
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2}|OTHER)$/, 'Please select your country'),
  timezone: z.string().min(1).optional(),
});

const studentDetailsSchema = z.object({
  childName: z.string().min(1, "Child's name is required").max(100),
  ageOrGrade: z.string().min(1, 'Age or grade is required').max(50),
  subject: z.string().min(1, 'Subject of interest is required').max(100),
  goals: z.string().min(1, 'Please share the learning goals').max(1000),
  contactPhone: z.string().min(5, 'A valid contact number is required').max(30),
});

const createBookingSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:mm'),
    contactEmail: z.string().email('Invalid email address').optional(),
    bookingType: z.enum(['trial', 'full_coaching']).default('trial'),
    // Required only when bookingType is 'full_coaching' - enforced below
    // via superRefine so a trial booking never has to send this at all.
    studentDetails: studentDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bookingType === 'full_coaching' && !data.studentDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentDetails'],
        message: 'Student details are required for a full coaching booking.',
      });
    }
  });

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  timezone: z.string().min(1).optional(),
});

const createMentorSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  timezone: z.string().min(1).default('Asia/Kolkata'),
  expertise: z.array(z.string()).optional(),
  maxClassesPerDay: z.number().int().positive().optional(),
});

const updateMentorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).optional(),
  accountActive: z.boolean().optional(),
  profileActive: z.boolean().optional(),
  expertise: z.array(z.string()).optional(),
  maxClassesPerDay: z.number().int().positive().nullable().optional(),
});

const updateConfigSchema = z.object({
  defaultMaxClassesPerDay: z.number().int().positive().optional(),
  reminderLeadTimeMinutes: z.number().int().nonnegative().optional(),
  slotDurationMinutes: z.number().int().positive().optional(),
  maxFreeTrialsPerFamily: z.number().int().nonnegative().optional(),
  businessHours: z
    .object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    })
    .optional(),
  blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

module.exports = {
  signupSchema,
  verifySignupOtpSchema,
  resendSignupOtpSchema,
  loginSchema,
  adminLoginSchema,
  changePasswordSchema,
  googleAuthSchema,
  setCountrySchema,
  createBookingSchema,
  availabilityQuerySchema,
  createMentorSchema,
  updateMentorSchema,
  updateConfigSchema,
};