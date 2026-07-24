/**
 * 每日运势 / 黄历页（路由 /daily）。
 * 仅作 DailyFortune 组件的完整形态承载页，纯前端无 DB。
 */

import { Box } from '@mui/material';
import DailyFortune from '../components/DailyFortune';

export default function Daily() {
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 6, md: 9 } }}>
      <DailyFortune />
    </Box>
  );
}
