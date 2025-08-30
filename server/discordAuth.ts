import express from "express";
import session from "express-session";
import passport from "passport";
import DiscordStrategy from "passport-discord";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const DISCORD_CLIENT_ID = "1411133132505219082";
const DISCORD_CLIENT_SECRET = "FH6dPw_m4vKJUnJ2HQ_drIcxdBB9tH_M";
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/discord/callback`
  : "http://localhost:5000/api/discord/callback";

export function setupDiscordAuth(app: express.Application) {
  // Session setup with proper cookie handling
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "user_sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "PTFS_GROUND_CREW_SECRET_2024",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'ptfs.session',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Discord Strategy
  passport.use(new DiscordStrategy({
    clientID: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    callbackURL: REDIRECT_URI,
    scope: ['identify', 'email']
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log('Discord profile received:', {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        email: profile.email,
        avatar: profile.avatar
      });

      // Create user object
      const user: User = {
        id: profile.id,
        email: profile.email || `${profile.username}@discord.local`,
        firstName: profile.global_name?.split(' ')[0] || profile.username,
        lastName: profile.global_name?.split(' ').slice(1).join(' ') || profile.discriminator || '',
        profileImageUrl: profile.avatar 
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user in database
      await storage.upsertUser(user);
      
      console.log('User saved to database:', user.id);
      return done(null, user);
    } catch (error) {
      console.error('Discord auth error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Cookie consent endpoint
  app.post('/api/cookie-consent', (req, res) => {
    const { consent } = req.body;
    if (consent === 'accept') {
      res.cookie('cookie_consent', 'accepted', {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    res.json({ success: true });
  });

  // Auth routes
  app.get('/api/discord/login', (req, res, next) => {
    // Check cookie consent first
    const cookieConsent = req.cookies?.cookie_consent;
    if (!cookieConsent) {
      return res.redirect('/?consent=required');
    }
    
    passport.authenticate('discord')(req, res, next);
  });

  app.get('/api/discord/callback', 
    passport.authenticate('discord', { 
      failureRedirect: '/?error=auth_failed',
      successRedirect: '/'
    })
  );

  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy(() => {
        res.clearCookie('ptfs.session');
        res.json({ success: true });
      });
    });
  });

  return app;
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};