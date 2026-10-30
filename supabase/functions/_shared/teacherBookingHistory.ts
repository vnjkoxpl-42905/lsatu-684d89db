// Existing admin history read, with an exact student/pass/request binding for recovery.
export async function readTeacherBookingHistory(admin:any, studentId:string, passId:string, operationKey:string) {
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!uuid.test(studentId)||!uuid.test(passId)||!uuid.test(operationKey)) throw new Error('invalid_history_identity');
 const {data:pass,error:passError}=await admin.from('booking_passes').select('id,student_id,status').eq('id',passId).eq('student_id',studentId).maybeSingle();
 if(passError)throw new Error('history_pass_unavailable');
 if(!pass||pass.id!==passId||pass.student_id!==studentId)throw new Error('history_pass_mismatch');
 const {data,error}=await admin.from('booking_pass_redemptions').select('*').eq('booking_pass_id',passId).eq('idempotency_key',operationKey);
 if(error||!Array.isArray(data))throw new Error('history_unavailable');
 if(data.some((row:any)=>row.booking_pass_id!==passId||row.idempotency_key!==operationKey))throw new Error('history_identity_mismatch');
 return {pass_id:passId,student_id:studentId,redemptions:data.map((row:any)=>({...row,student_id:studentId}))};
}
