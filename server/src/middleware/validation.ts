import { Request, Response, NextFunction } from 'express';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateBatch = (batch: string): boolean => {
  const batchRegex = /^\d{2}[A-Z]-\d{4}$/; // Format: 22L-6619
  return batchRegex.test(batch);
};

export const validateRegisterInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, email, password, batch } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ 
      success: false, 
      error: 'Name must be at least 2 characters long' 
    });
    return;
  }

  if (!email || !validateEmail(email)) {
    res.status(400).json({ 
      success: false, 
      error: 'Valid email is required' 
    });
    return;
  }

  if (!password || !validatePassword(password)) {
    res.status(400).json({ 
      success: false, 
      error: 'Password must be at least 6 characters long' 
    });
    return;
  }

  if (!batch || !validateBatch(batch)) {
    res.status(400).json({ 
      success: false, 
      error: 'Valid batch format required (e.g., 22L-6619)' 
    });
    return;
  }

  next();
};

export const validateLoginInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || !validateEmail(email)) {
    res.status(400).json({ 
      success: false, 
      error: 'Valid email is required' 
    });
    return;
  }

  if (!password) {
    res.status(400).json({ 
      success: false, 
      error: 'Password is required' 
    });
    return;
  }

  next();
};
