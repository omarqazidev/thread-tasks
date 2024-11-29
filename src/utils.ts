import { readFileSync } from 'fs';

export const isTimeBetween = (startTime: string, endTime: string) => {
  const startHourMin = startTime.split(':');
  const start = Number(startHourMin[0]) * 60 + Number(startHourMin[1]);

  const endHourMin = endTime.split(':');
  const end = Number(endHourMin[0]) * 60 + Number(endHourMin[1]);

  const date = new Date();
  const now = date.getHours() * 60 + date.getMinutes();

  if (start <= now && now <= end) {
    return true;
  }
  return false;
};

export const getFeatureFlags = () => {
  try {
    const featureFlags = JSON.parse(readFileSync('./env.json', 'utf8'));
    return featureFlags;
  } catch (e) {
    console.log('Error: loading feature flags');
    return null;
  }
};
