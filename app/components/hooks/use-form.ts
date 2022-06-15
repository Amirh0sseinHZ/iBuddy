export function useForm(errors: any) {
  function register(name: any) {
    const error = errors?.[name]
    return {
      name,
      error: !!error,
      helperText: error,
    }
  }

  return { register }
}
