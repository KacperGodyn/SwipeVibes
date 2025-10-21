let ACCESS: string | null = null;

export const getAccessToken = () => ACCESS;
export const setAccessToken = (t: string | null) => {
  ACCESS = t;
};