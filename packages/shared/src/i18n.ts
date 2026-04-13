import { z } from 'zod';

// Load Zod v4's native simplified Chinese locale
import { zhCN } from 'zod/locales';

// Set the global locale error map using Zod's built-in configuration
z.config(zhCN());