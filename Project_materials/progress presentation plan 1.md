ok so scratch that. this is the text i sent to my teammates: 

shoudl we implement full database ? naki partially for the progress presentation? 

also we can divide our system into essentially 2 parts. 

1. Sales 
2. HR management

[1] Sales would include - selling and buying products, Contacts (registered regular customers ), Warranty replacement, Inventory etc 

[2] HR would be - employees, their profiles, employee salary/payslips, attendence etc 

we could say that there is a 3rd part and that is banking: bank accounts with balances, 
and all these parts are i feel like more or less connected by transactions 




which part should we implement? like a specific part or a mix of all of them? I feel like we should do the sales part coz then we could show "sir here we are adding products" "here we are making an invoice / sales recept" 
and even if we implement any one part should we still implement or like create all the tables that we have planned? like "sir this is our current version of all the tables, there might be changes needed in the future and we will modify the table accordingly" (which brings in the problem of cascading failure from editing tables later on)


to which they replied:

Ig amra fully just sales tai implement kori
R tables shob gula banae rakhi
Mane database ta implement kore rakhi

so this is what we want to do for the progress presentation 


for this, we will need a category builder where we will define new products and then we can add specific products to the product list and finally after that we can add stock to those products. make those tables necessary for that


I basically want to do the follwing for the progress presentation:

1. define new category
2. define product under that category
3. add stock to that product (buy stocks or products. will cause the business to spend money and adjust relevant financial info)
4. sell products by invoice to walk-in customers (cash or bank transfer)
5. sell products to registered customers (cash or bank or ledger. if leger then the customer will incur a due)
6. Generate public recept
7. view the inventory and stocks. 
8. view customers and suppliers (contacts) and sort the table in anyway like most dues, sales etc. 
9. each customer will have their own info page when clicked where their transactions stats will be displayed
10. on the customer's info page a button will show their transaction history with purchase and sales invoices referenced.

so let's make procedures, functions and triggers also for this and start the backend frontend implementation. 

first give me the full schema sql. I will make it in supabase. 
Didhiti and anjim will be working on the frondend mostly and i will be working on the backend mostly. 

make a fully comprehensive implementation guideline and tasks for them. specially for the pages that we will be implementing. describe the pages and they will decide how it would look. but the relevant pages must contain the forms with text fields, radi/checkbox, dropdowns as needed to enter data into the system.  you can add as many pages as needed but we will be using typescrpt using next.js for the frontend and node+express for the backend. the node backend is already initialized. 

one of the pages will be the dashboard which will contain:

1. quick button to add a sales/ purchase invoice or session
2. search bar for the products and customers/contacts using their relevant Id. 
3. other quick button or link

for now this is the version of the dashboard. in future when we will implemnt employee and login, then we will have an admin specific dashboard where besides all these, we will have summaries for the buiness like net profit, dues, creditors, debtors etc on the dashboard for the business owner to see. 