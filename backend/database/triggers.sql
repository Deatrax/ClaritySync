CREATE TRIGGER trg_auto_update_balance AFTER INSERT ON public.transaction FOR EACH ROW EXECUTE FUNCTION fn_update_bank_balance();


-- REMOVED: CREATE TRIGGER trg_aftersaleinsert AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION fn_after_sale_insert();



CREATE TRIGGER trg_update_contact_ledger AFTER INSERT ON public.transaction FOR EACH ROW EXECUTE FUNCTION fn_update_contact_ledger();