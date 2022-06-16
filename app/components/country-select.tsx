import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"

import { countries } from "~/utils/country"

export function CountrySelect(props: any) {
  return (
    <Autocomplete
      id="country-select-demo"
      options={countries}
      autoHighlight
      getOptionLabel={(option: any) => option?.label}
      renderOption={(props, option: any) => (
        <Box
          component="li"
          sx={{ "& > img": { mr: 2, flexShrink: 0 } }}
          {...props}
        >
          <img
            loading="lazy"
            width="20"
            src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w40/${option.code.toLowerCase()}.png 2x`}
            alt=""
          />
          {option?.label}
        </Box>
      )}
      renderInput={params => (
        <TextField
          {...params}
          label="Choose a country"
          inputProps={{
            ...params.inputProps,
            autoComplete: "new-password", // disable autocomplete and autofill
          }}
          {...props.inputProps}
        />
      )}
    />
  )
}
