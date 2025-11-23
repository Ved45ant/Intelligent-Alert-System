import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import config from "./index.js";
import { UserModel } from "../models/User.js";

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await UserModel.findOne({ googleId: profile.id });

          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google"), undefined);
            }

            user = await UserModel.findOne({ email });

            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              await user.save();
            } else {
              // User doesn't exist - reject login
              return done(new Error("No account found. Please create an account first using email/password, then you can link your Google account."), undefined);
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
