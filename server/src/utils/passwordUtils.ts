import bcrypt from 'bcrypt';

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (
  password: string, 
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export default { hashPassword, comparePassword };
