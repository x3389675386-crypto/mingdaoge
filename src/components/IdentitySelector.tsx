/**
 * 注册页身份选择卡（P0-1 / P0-2）。
 *
 * 三选一：顾客 / 散修 / 法脉。
 * - 顾客：无二级细分（subtype='customer'）。
 * - 散修 / 法脉：二级细分下拉（8 / 12 项，数据来自 src/lib/identities.ts）。
 *
 * 本期不支持自由填写；选项与 user_identities 种子、identities.ts 保持一致。
 */

import { Box, Typography, ToggleButton, ToggleButtonGroup, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { IDENTITY_GROUPS } from '../lib/identities';
import type { IdentityType } from '../types';

/** 受控值：当前选中的身份大类与二级细分 */
export interface IdentityValue {
  type: IdentityType;
  subtype: string | null;
}

interface IdentitySelectorProps {
  value: IdentityValue;
  onChange: (value: IdentityValue) => void;
}

export default function IdentitySelector({ value, onChange }: IdentitySelectorProps) {
  const activeGroup = IDENTITY_GROUPS.find((g) => g.type === value.type) ?? IDENTITY_GROUPS[0];
  const needsSubtype = activeGroup.subtypes.length > 1;

  const handleTypeChange = (_e: React.MouseEvent<HTMLElement>, type: IdentityType | null) => {
    if (!type) return;
    const group = IDENTITY_GROUPS.find((g) => g.type === type);
    if (!group) return;
    // 切换大类时重置二级细分（顾客无细分，其它取第一项）
    const subtype = group.subtypes.length === 1 ? group.subtypes[0].key : group.subtypes[0].key;
    onChange({ type, subtype });
  };

  const handleSubtypeChange = (key: string) => {
    onChange({ type: value.type, subtype: key });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.8rem', mb: 1 }}
      >
        选择身份
      </Typography>

      <ToggleButtonGroup
        value={value.type}
        exclusive
        onChange={handleTypeChange}
        sx={{
          display: 'flex',
          width: '100%',
          '& .MuiToggleButton-root': {
            flex: 1,
            color: 'rgba(201,169,110,0.6)',
            borderColor: 'rgba(201,169,110,0.2)',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.9rem',
            py: 1,
            '&.Mui-selected': {
              backgroundColor: 'rgba(201,169,110,0.15)',
              color: '#c9a96e',
              borderColor: 'rgba(201,169,110,0.5)',
            },
          },
        }}
      >
        {IDENTITY_GROUPS.map((g) => (
          <ToggleButton key={g.type} value={g.type}>
            {g.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {needsSubtype && (
        <FormControl fullWidth sx={{ mt: 1.5 }}>
          <InputLabel sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' }}>
            细分
          </InputLabel>
          <Select
            value={value.subtype ?? ''}
            label="细分"
            onChange={(e) => handleSubtypeChange(e.target.value)}
            sx={{
              fontFamily: 'var(--font-serif)',
              color: '#f5f0eb',
              '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
              '& .MuiSvgIcon-root': { color: 'rgba(201,169,110,0.6)' },
            }}
          >
            {activeGroup.subtypes.map((s) => (
              <MenuItem key={s.key} value={s.key} sx={{ fontFamily: 'var(--font-serif)' }}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
