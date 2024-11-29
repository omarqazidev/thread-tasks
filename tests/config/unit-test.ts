export async function unitTest(
  description: string,
  testFunction: () => Promise<any> | (() => any)
) {
  console.log('\n\x1b[33m------------ TEST ------------');
  console.log(description, '\n\x1b[0m');
  await testFunction();
  console.log('\n\x1b[33m------------ ---- ------------\x1b[0m');
}
